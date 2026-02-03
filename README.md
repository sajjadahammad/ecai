# commit-impact-cli

Lists Playwright tests impacted by a git commit: **added**, **removed**, or **modified**. Includes transitive impact when helper/utility files used by tests change.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- A **local clone** of the repo to analyze (e.g. [flash-tests](https://github.com/empirical-run/flash-tests))

## Install and run

```bash
npm install
npm run build
npx . --commit <sha> --repo <path-to-flash-tests>
```

Or call the bin by name:

```bash
npx commit-impact --commit 45433fd --repo /path/to/flash-tests
```

### Options

| Option        | Required | Description                                      |
|---------------|----------|--------------------------------------------------|
| `--commit`    | Yes      | Commit SHA to analyze (e.g. `75cdcc5`, `45433fd`) |
| `--repo`      | Yes      | Path to local clone of the repo                  |
| `--machine`   | No       | Output machine-friendly format (tab-separated)   |

### Example output (human-readable)

```
2 test(s) modified:
  - "Subscribe to session and verify in Subscribed sessions list" in tests/sessions.spec.ts
  - "Filter sessions list by users" in tests/sessions.spec.ts
```

### Example output (machine-friendly, `--machine`)

```
modified	tests/sessions.spec.ts	Subscribe to session and verify in Subscribed sessions list
modified	tests/sessions.spec.ts	Filter sessions list by users
```

## Example commits (flash-tests)

- **75cdcc5** – Adds one test: "safeBash tool execution to get commit SHA" in `tests/tool-execution/session.spec.ts`
- **5df7e4d** – Modifies two tests in `tests/sessions.spec.ts`
- **6d8159d** – Removes one test: "Sort sessions by title" in `tests/sessions.spec.ts`
- **45433fd** – Modifies a helper; multiple specs that import it are impacted (e.g. "set human triage for failed test" in `tests/test-runs.spec.ts` + others)

## Scripts

| Script   | Description                |
|----------|----------------------------|
| `build`  | Compile TypeScript         |
| `lint`   | Run ESLint on `src/`       |
| `format` | Run Prettier on `src/**/*.ts` |
| `test`   | Run tests                  |

## How it works (implementation logic)

### Overview

The CLI takes a commit SHA and repo path, then:

1. Resolves the ref to a full SHA and loads the commit’s diff.
2. Computes **direct impact** from changed spec files (added/removed/modified tests).
3. Computes **transitive impact** from changed non-spec files (specs that import them get their tests marked modified).
4. Deduplicates and prints the list.

### 1. Commit SHA resolution (`git-ops.ts`)

- **Full SHA or prefix:** `git rev-parse --verify <ref>` (Git’s normal prefix match, e.g. first 7 chars).
- **Suffix (e.g. last 7 chars):** If that fails and the ref looks like a hex SHA (6–40 chars), we run `git rev-list -n 10000 --all`, then in JS find commits whose full SHA **ends with** the given string. The first match is used.

All later steps use this resolved full 40-char SHA.

### 2. Commit diff (`git-ops.ts`)

- **Parent:** `git log -1 --format=%P <sha>` to get the parent commit (for “before” content).
- **Changed files:** `git show --name-status <sha>` to get per-file status:
  - **A** = added, **M** = modified, **D** = deleted.

File content at a revision is read with `git show <rev>:<path>`.

### 3. Direct impact: spec files (`get-impact.ts` + `parse-tests.ts`)

Changed files are split into **spec files** (`*.spec.ts` / `*.spec.tsx`) and **non-spec files**.

For each changed spec file:

- **Added (A):** Read file at the commit; parse test names; report each as **added**.
- **Removed (D):** Read file at parent; parse test names; report each as **removed**.
- **Modified (M):** Read file at parent and at commit. Parse test names in both. For each test name:
  - In “before” only → **removed**
  - In “after” only → **added**
  - In both → **modified**

**Test name parsing (`parse-tests.ts`):** Line-by-line regex for:

- `test\s*\(\s*['"`]([^'"`]+)['"`]` → test title
- `test\s*\.\s*describe\s*\(\s*['"`]([^'"`]+)['"`]` → describe title

Brace depth is tracked so tests inside a `test.describe('...')` get a full name like `"describe title > test title"`.

### 4. Transitive impact (`transitive-impact.ts`)

When the commit changes **non-spec** files (helpers, utils, etc.):

1. **All spec files** at that commit: `git ls-tree -r --name-only <sha>`, then filter by `*.spec.ts` / `*.spec.tsx`.
2. **Imports in each spec:** Regex for `from '...'`, `import '...'`, `require('...')`; keep only paths starting with `.` (relative).
3. **Resolution:** For each relative import, resolve from the spec file’s directory and drop extension. If that path equals any changed non-spec file (path normalized, extension stripped), the spec is **impacted**.
4. For each impacted spec, read its content at the commit, parse test names, and report every test in that file as **modified**.

So changing a helper used by 4 spec files yields “modified” for all tests in those 4 files.

### 5. Dedup and output

Impact items are deduplicated by `(type, file, testName)` so a test isn’t listed twice (e.g. both from direct spec change and from transitive). Output is either human-readable (grouped by type) or machine-friendly (`--machine`: one line per test, tab-separated `type\tfile\ttestName`).

### Module layout

| Module | Role |
|--------|------|
| `cli.ts` | Commander: `--commit`, `--repo`, `--machine`; calls `getImpact`, then `formatHuman` or `formatMachine`. |
| `get-impact.ts` | Orchestrates: resolve SHA, get diff, direct impact (spec A/M/D), transitive impact, dedup. |
| `git-ops.ts` | Git: resolve SHA, commit diff, file content at revision, list files at revision. |
| `parse-tests.ts` | Parse spec file source into test names (including describe nesting). |
| `transitive-impact.ts` | List spec files at revision; find specs that import given changed files. |
| `format-report.ts` | Human and machine-friendly output from impact list. |
| `types.ts` | `ImpactItem`, `ImpactType`, `ChangedFile`. |

## Limitations

- Only relative imports are followed for transitive impact (no `node_modules` or path-mapped imports).
- Test names are parsed with regex; nested `test.describe` is supported, but very unusual formatting might be missed.
- Requires a local clone; no GitHub API or token.
- Suffix SHA match scans up to 10k commits; very old or shallow clones might not resolve last-7.

## License

MIT
