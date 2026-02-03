/**
 * Extract test and describe block names from Playwright/JS test file content.
 * Matches test('...'), test("..."), test.describe('...'), test.describe("...").
 * Returns full test name: "describe name" + "test name" for nesting.
 */

export interface ParsedTest {
  /** Full display name (describe + test, or just test name) */
  name: string;
  /** Describe block name if inside one */
  describeName: string | null;
}

/**
 * Parse a spec file's source and return list of test names (top-level test titles).
 * describe blocks are noted so we can build "describe name" + "test name" when needed.
 */
export function parseTestNamesFromSource(source: string): ParsedTest[] {
  const results: ParsedTest[] = [];
  const lines = source.split("\n");

  let currentDescribe: string | null = null;
  let describeDepth = 0;
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track describe blocks by { }
    if (trimmed.includes("{")) depth++;
    if (trimmed.includes("}")) depth--;

    const describeMatch = trimmed.match(/test\s*\.\s*describe\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (describeMatch) {
      currentDescribe = describeMatch[1];
      describeDepth = depth;
    }

    const testMatch = trimmed.match(/test\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (testMatch) {
      const testName = testMatch[1];
      const fullName =
        currentDescribe !== null ? `${currentDescribe} > ${testName}` : testName;
      results.push({
        name: fullName,
        describeName: currentDescribe,
      });
    }

    // Reset describe when we exit its block (depth went below the describe's opening)
    if (describeDepth > 0 && depth < describeDepth) {
      currentDescribe = null;
      describeDepth = 0;
    }
  }

  return results;
}
