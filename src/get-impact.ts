import path from "node:path";
import fs from "node:fs";
import {
  getCommitDiff,
  getFileAtRevision,
  resolveCommitSha,
  listFilesAtRevision,
} from "./git-ops.js";
import { parseTestNamesFromSource } from "./parse-tests.js";
import {
  getSpecFilesAtRevision,
  findSpecsImportingChangedFiles,
} from "./transitive-impact.js";
import type { ImpactItem } from "./types.js";

const SPEC_EXT = ".spec.ts";
const SPEC_EXT_ALT = ".spec.tsx";

function isSpecFile(filePath: string): boolean {
  return filePath.endsWith(SPEC_EXT) || filePath.endsWith(SPEC_EXT_ALT);
}

export async function getImpact(
  repoPath: string,
  sha: string
): Promise<ImpactItem[]> {
  const resolvedRepo = path.resolve(repoPath);
  if (!fs.existsSync(resolvedRepo) || !fs.statSync(resolvedRepo).isDirectory()) {
    throw new Error(`Repo path is not a directory: ${repoPath}`);
  }
  const fullSha = await resolveCommitSha(resolvedRepo, sha);
  if (!fullSha) {
    throw new Error(`Commit not found: ${sha}`);
  }

  const { changedFiles, parentSha } = await getCommitDiff(resolvedRepo, fullSha);
  const items: ImpactItem[] = [];
  const seen = new Set<string>();

  function dedup(item: ImpactItem): void {
    const key = `${item.type}\t${item.file}\t${item.testName}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  }

  const specChanges = changedFiles.filter((f) => isSpecFile(f.path));
  const nonSpecChanges = changedFiles.filter((f) => !isSpecFile(f.path));

  for (const f of specChanges) {
    if (f.status === "A") {
      const content = await getFileAtRevision(resolvedRepo, fullSha, f.path);
      if (content) {
        const tests = parseTestNamesFromSource(content);
        for (const t of tests) {
          dedup({ type: "added", file: f.path, testName: t.name });
        }
      }
    } else if (f.status === "D") {
      const content = parentSha
        ? await getFileAtRevision(resolvedRepo, `${fullSha}^`, f.path)
        : null;
      if (content) {
        const tests = parseTestNamesFromSource(content);
        for (const t of tests) {
          dedup({ type: "removed", file: f.path, testName: t.name });
        }
      }
    } else if (f.status === "M" && parentSha) {
      const before = await getFileAtRevision(resolvedRepo, `${fullSha}^`, f.path);
      const after = await getFileAtRevision(resolvedRepo, fullSha, f.path);
      const beforeTests = before ? parseTestNamesFromSource(before) : [];
      const afterTests = after ? parseTestNamesFromSource(after) : [];
      const beforeNames = new Set(beforeTests.map((t) => t.name));
      const afterNames = new Set(afterTests.map((t) => t.name));
      for (const t of beforeTests) {
        if (!afterNames.has(t.name)) dedup({ type: "removed", file: f.path, testName: t.name });
      }
      for (const t of afterTests) {
        if (!beforeNames.has(t.name)) dedup({ type: "added", file: f.path, testName: t.name });
        else dedup({ type: "modified", file: f.path, testName: t.name });
      }
    }
  }

  // Transitive: specs that import changed non-spec files
  if (nonSpecChanges.length > 0 && parentSha) {
    const allSpecs = await getSpecFilesAtRevision(fullSha, (rev) =>
      listFilesAtRevision(resolvedRepo, rev)
    );
    const getContent = (rev: string, filePath: string) =>
      getFileAtRevision(resolvedRepo, rev, filePath);
    const impactedSpecs = await findSpecsImportingChangedFiles(
      fullSha,
      nonSpecChanges.map((f) => f.path),
      allSpecs,
      getContent
    );
    for (const specPath of impactedSpecs) {
      const content = await getFileAtRevision(resolvedRepo, fullSha, specPath);
      if (content) {
        const tests = parseTestNamesFromSource(content);
        for (const t of tests) {
          dedup({ type: "modified", file: specPath, testName: t.name });
        }
      }
    }
  }

  return items;
}
