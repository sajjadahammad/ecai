#!/usr/bin/env node
import { Command } from "commander";
import { getImpact } from "./get-impact.js";
import { formatMachine, formatHuman } from "./format-report.js";

const program = new Command();

program
  .name("commit-impact")
  .description(
    "List Playwright tests impacted by a git commit (added, removed, modified), including transitive impact from helper changes."
  )
  .requiredOption(
    "--commit <sha>",
    "Commit SHA to analyze (e.g. 45433fd)"
  )
  .requiredOption(
    "--repo <path>",
    "Path to local clone of the repo (e.g. flash-tests)"
  )
  .option(
    "--machine",
    "Output machine-friendly format (type\\tfile\\ttestName per line)"
  )
  .action(async (options: { commit: string; repo: string; machine?: boolean }) => {
    try {
      const items = await getImpact(options.repo, options.commit);
      if (options.machine) {
        console.log(formatMachine(items));
      } else {
        console.log(formatHuman(items));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("commit-impact:", message);
      process.exit(1);
    }
  });

program.parse();
