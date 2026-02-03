import path from "node:path";

const SPEC_EXT = ".spec.ts";
const SPEC_EXT_ALT = ".spec.tsx";

/**
 * Get all .spec.ts / .spec.tsx file paths in the repo at the given revision.
 */
export async function getSpecFilesAtRevision(
  revision: string,
  gitLsTree: (rev: string) => Promise<string[]>
): Promise<string[]> {
  const all = await gitLsTree(revision);
  return all.filter(
    (p) => p.endsWith(SPEC_EXT) || p.endsWith(SPEC_EXT_ALT)
  );
}

/**
 * Extract import paths from file content (relative only).
 * Matches: import ... from 'path', import 'path', require('path')
 */
function extractRelativeImports(source: string): string[] {
  const paths: string[] = [];
  const fromRe = /from\s+['"]([^'"]+)['"]/g;
  const importRe = /import\s+['"]([^'"]+)['"]/g;
  const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const re of [fromRe, importRe, requireRe]) {
    let m;
    while ((m = re.exec(source)) !== null) {
      if (m[1].startsWith(".")) paths.push(m[1]);
    }
  }
  return paths;
}

/**
 * Find spec files that import any of the given changed (non-spec) files.
 * changedFiles: list of paths (e.g. from git diff) that are NOT spec files.
 * Returns list of spec file paths that should be considered modified (transitive impact).
 */
export async function findSpecsImportingChangedFiles(
  revision: string,
  changedNonSpecFiles: string[],
  specFiles: string[],
  getFileContent: (
    rev: string,
    filePath: string
  ) => Promise<string | null>
): Promise<string[]> {
  const normalizedChanged = new Set(
    changedNonSpecFiles.map((p) => path.normalize(p).replace(/\.(ts|tsx|js|jsx)$/, ""))
  );
  const impacted: string[] = [];

  for (const specPath of specFiles) {
    const content = await getFileContent(revision, specPath);
    if (!content) continue;
    const imports = extractRelativeImports(content);
    const fromDir = path.dirname(specPath);
    for (const imp of imports) {
      const resolved = path.normalize(path.join(fromDir, imp)).replace(/\.(ts|tsx|js|jsx)$/, "");
      if (normalizedChanged.has(resolved)) {
        impacted.push(specPath);
        break;
      }
    }
  }

  return impacted;
}
