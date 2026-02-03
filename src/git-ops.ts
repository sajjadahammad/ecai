import { simpleGit, SimpleGit } from "simple-git";
import path from "node:path";
import { ChangedFile } from "./types.js";

export interface CommitDiffResult {
  changedFiles: ChangedFile[];
  parentSha: string | null;
}

/**
 * Get list of changed files and parent SHA for a commit.
 * Uses `git show --name-status` to get A/M/D status per file.
 */
export async function getCommitDiff(
  repoPath: string,
  sha: string
): Promise<CommitDiffResult> {
  const git = getGit(repoPath);

  const log = await git.raw(["log", "-1", "--format=%P", sha]);
  const parentSha = log.trim().split(/\s+/)[0] || null;

  const nameStatus = await git.raw(["show", "--name-status", "--format=", sha]);
  const changedFiles: ChangedFile[] = [];

  for (const line of nameStatus.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([AMD])\s+(.+)$/);
    if (match) {
      const status = match[1] as "A" | "M" | "D";
      const filePath = match[2].trim();
      changedFiles.push({ path: filePath, status });
    }
  }

  return { changedFiles, parentSha };
}

/**
 * Get file content at a given revision (sha or sha^).
 */
export async function getFileAtRevision(
  repoPath: string,
  revision: string,
  filePath: string
): Promise<string | null> {
  const git = getGit(repoPath);
  try {
    const content = await git.raw(["show", `${revision}:${filePath}`]);
    return content;
  } catch {
    return null;
  }
}

const HEX_SHA_RE = /^[0-9a-fA-F]{6,40}$/;

/**
 * Resolve a commit ref to a full 40-char SHA.
 * Accepts full SHA, short prefix (first 7 chars), or suffix (e.g. last 7 chars).
 */
export async function resolveCommitSha(
  repoPath: string,
  ref: string
): Promise<string | null> {
  const git = getGit(repoPath);
  try {
    const out = await git.raw(["rev-parse", "--verify", ref]);
    const full = out.trim();
    return full.length === 40 ? full : null;
  } catch {
    // Git only matches by prefix. If user passed last-7 (suffix), try to find by suffix.
    if (!HEX_SHA_RE.test(ref) || ref.length > 40) return null;
    try {
      const out = await git.raw(["rev-list", "-n", "10000", "--all"]);
      const lines = out.trim().split("\n").filter(Boolean);
      const suffix = ref.toLowerCase();
      const matches = lines.filter((sha) => sha.toLowerCase().endsWith(suffix));
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) return matches[0]; // first match if ambiguous
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Check if a commit exists in the repo; returns full SHA or null.
 */
export async function commitExists(
  repoPath: string,
  sha: string
): Promise<boolean> {
  return (await resolveCommitSha(repoPath, sha)) !== null;
}

/**
 * List all tracked files at a revision.
 */
export async function listFilesAtRevision(
  repoPath: string,
  revision: string
): Promise<string[]> {
  const git = getGit(repoPath);
  const out = await git.raw(["ls-tree", "-r", "--name-only", revision]);
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getGit(repoPath: string): SimpleGit {
  return simpleGit({ baseDir: path.resolve(repoPath) });
}
