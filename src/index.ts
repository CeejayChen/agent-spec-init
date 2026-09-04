#!/usr/bin/env node
/**
 * agent-spec-init — CLI entry point
 *
 * Initializes an AI agent development specification system in the current
 * or specified directory. Extracts proven patterns from deepseek-harness
 * into parameterized templates.
 *
 * Usage:
 *   npx agent-spec-init [options]
 *   agent-spec-init [options]
 *
 * Options:
 *   --name <name>          Project name (default: interactive prompt)
 *   --lang <en|bilingual>  Language support (default: interactive)
 *   --pm <npm|pnpm|yarn>   Package manager (default: auto-detect)
 *   --skip-install         Skip dependency installation
 *   --no-gates             Skip verify gate scripts generation
 *   --force                Overwrite existing files
 *   -y, --yes              Accept all defaults, skip interactive prompts
 *   -h, --help             Show help
 *
 * Inspired by the agent specification system in deepseek-harness.
 * See: https://github.com/deepseek-ai/deepseek-harness
 */

import { Command } from "commander";
import * as clack from "@clack/prompts";
import { resolve } from "node:path";
import { scaffold } from "./scaffold.js";
import { gatherOptions, type CliFlags } from "./prompts.js";

const program = new Command();

program
  .name("agent-spec-init")
  .description(
    "Initialize an AI agent development specification system in your project.\n\n" +
    "Creates layered AGENTS.md instructions, an Agent Notes RFC/ADR system,\n" +
    "reusable Skills, and machine-checkable verification gates.\n\n" +
    "Inspired by the proven patterns from deepseek-harness."
  )
  .version("0.1.1")
  .option("--name <name>", "Project name")
  .option("--lang <en|bilingual>", "Language support (en or bilingual)")
  .option("--pm <npm|pnpm|yarn>", "Package manager")
  .option("--skip-install", "Skip dependency installation")
  .option("--no-gates", "Skip verify gate scripts generation")
  .option("--force", "Overwrite existing files")
  .option("-y, --yes", "Accept all defaults, skip interactive prompts")
  .action(async (opts) => {
    const flags: CliFlags = {
      name: opts.name,
      lang: opts.lang,
      pm: opts.pm,
      skipInstall: opts.skipInstall,
      noGates: opts.noGates,
      force: opts.force,
      yes: opts.yes,
    };

    let options;
    try {
      options = await gatherOptions(flags);
    } catch (err) {
      clack.log.error(`Failed to gather options: ${err}`);
      process.exit(1);
    }

    const targetDir = resolve(".");
    const spinner = clack.spinner();

    spinner.start("Scaffolding agent specification system...");
    const result = scaffold(targetDir, options);
    spinner.stop("Scaffolding complete.");

    // Report results
    console.log("");
    if (result.created.length > 0) {
      clack.log.success(`Created ${result.created.length} file(s):`);
      for (const file of result.created) {
        console.log(`  ✅ ${file}`);
      }
    }

    if (result.skipped.length > 0) {
      clack.log.warn(`Skipped ${result.skipped.length} existing file(s) (use --force to overwrite):`);
      for (const file of result.skipped) {
        console.log(`  ⏭️  ${file}`);
      }
    }

    if (result.errors.length > 0) {
      clack.log.error(`${result.errors.length} error(s):`);
      for (const err of result.errors) {
        console.error(`  ❌ ${err}`);
      }
    }

    // Next steps
    console.log("");
    clack.log.info("Next steps:");
    console.log(`  1. Review and customize AGENTS.md for your project`);
    console.log(`  2. Edit docs/architecture.md with your project's structure`);
    if (options.includeGates) {
      console.log(`  3. Run "${options.packageManager === "npm" ? "npm run" : options.packageManager === "yarn" ? "yarn" : "pnpm run"} doc-sync" to verify documentation gates`);
    }
    console.log(`  4. Add Agent Notes for significant decisions under .agents/notes/`);
    console.log("");

    clack.outro("Done! Your agent specification system is ready. 🚀");
  });

program.parse();
