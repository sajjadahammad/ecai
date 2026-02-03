import type { ImpactItem } from "./types.js";

/**
 * Machine-friendly: one line per test: type\tfile\ttestName
 */
export function formatMachine(items: ImpactItem[]): string {
  return items
    .map((i) => `${i.type}\t${i.file}\t${i.testName}`)
    .join("\n");
}

/**
 * Human-readable summary for the reviewer.
 */
export function formatHuman(items: ImpactItem[]): string {
  const added = items.filter((i) => i.type === "added");
  const removed = items.filter((i) => i.type === "removed");
  const modified = items.filter((i) => i.type === "modified");

  const lines: string[] = [];
  if (added.length) {
    lines.push(`${added.length} test(s) added:`);
    for (const i of added) {
      lines.push(`  - "${i.testName}" in ${i.file}`);
    }
  }
  if (removed.length) {
    lines.push(`${removed.length} test(s) removed:`);
    for (const i of removed) {
      lines.push(`  - "${i.testName}" in ${i.file}`);
    }
  }
  if (modified.length) {
    lines.push(`${modified.length} test(s) modified:`);
    for (const i of modified) {
      lines.push(`  - "${i.testName}" in ${i.file}`);
    }
  }
  if (lines.length === 0) return "No impacted tests.";
  return lines.join("\n");
}
