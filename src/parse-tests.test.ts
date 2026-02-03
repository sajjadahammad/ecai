import { describe, it } from "node:test";
import assert from "node:assert";
import { parseTestNamesFromSource } from "./parse-tests.js";

describe("parseTestNamesFromSource", () => {
  it("extracts top-level test names", () => {
    const source = `
      test('hello world', async ({ page }) => {});
      test("another test", async () => {});
    `;
    const tests = parseTestNamesFromSource(source);
    assert.strictEqual(tests.length, 2);
    assert.strictEqual(tests[0].name, "hello world");
    assert.strictEqual(tests[1].name, "another test");
  });

  it("extracts test name inside test.describe", () => {
    const source = `
      test.describe('sessions', () => {
        test('Subscribe to session and verify in Subscribed sessions list', async () => {});
        test('Filter sessions list by users', async () => {});
      });
    `;
    const tests = parseTestNamesFromSource(source);
    assert.strictEqual(tests.length, 2);
    assert.strictEqual(
      tests[0].name,
      "sessions > Subscribe to session and verify in Subscribed sessions list"
    );
    assert.strictEqual(tests[1].name, "sessions > Filter sessions list by users");
  });

  it("returns empty array for non-test content", () => {
    const tests = parseTestNamesFromSource("const x = 1;");
    assert.strictEqual(tests.length, 0);
  });
});
