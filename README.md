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

## Limitations

- Only relative imports are followed for transitive impact (no `node_modules` or path-mapped imports).
- Test names are parsed with regex; nested `test.describe` is supported, but very unusual formatting might be missed.
- Requires a local clone; no GitHub API or token.

## License

MIT
