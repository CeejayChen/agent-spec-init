#!/usr/bin/env node
/**
 * Command-line entry point for agent-spec-init.
 *
 * The CLI resolves options, plans the file set, writes it, runs optional
 * post-actions, and reports. All file content is produced by `buildPlan`, so
 * `--dry-run` shows exactly what a real run would write.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Command } from "commander";
import { applyPlan, previewPlan } from "./apply.js";
import { gitAvailable } from "./detect.js";
import { resolveOptions } from "./options.js";
import { buildPlan } from "./plan.js";
import { printReport, toJsonReport } from "./report.js";
import {
  UsageError,
  type CliFlags,
  type InitOptions,
  type ProjectFacts,
  type ScaffoldReport,
} from "./types.js";

/** Version read from the published package manifest. */
function readVersion(): string {
  try {
    const raw = readFileSync(new URL("../package.json", import.meta.url), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { version?: unknown }).version === "string"
    ) {
      return (parsed as { version: string }).version;
    }
  } catch {
    // Fall through: a missing manifest must not prevent the CLI from running.
  }
  return "0.0.0";
}

/** Post-actions requested by flags, run after files settle. */
function runPostActions(
  facts: ProjectFacts,
  options: InitOptions,
): { actions: string[]; errors: string[] } {
  const actions: string[] = [];
  const errors: string[] = [];

  if (options.git && !facts.hasGit) {
    if (!gitAvailable()) {
      errors.push("Cannot initialise git: `git` is not available on PATH.");
    } else {
      try {
        execFileSync("git", ["init"], { cwd: options.targetDir, stdio: "inherit" });
        actions.push("git init");
      } catch (err) {
        errors.push(`git init failed: ${String(err)}`);
      }
    }
  }

  if (options.install && options.template === "node" && options.includeGates) {
    const packageManager = options.packageManager;
    try {
      execFileSync(packageManager, ["install"], {
        cwd: options.targetDir,
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      actions.push(`${packageManager} install`);
    } catch (err) {
      errors.push(`${packageManager} install failed: ${String(err)}`);
    }
  }

  return { actions, errors };
}

/**
 * Execute one CLI invocation.
 *
 * @param flags Parsed flags.
 * @param cwd Directory relative targets resolve against.
 * @returns Process exit code.
 */
export async function run(flags: CliFlags, cwd: string): Promise<number> {
  if (!flags.yes && !flags.skillOnly && !process.stdin.isTTY) {
    console.error(
      "This terminal is not interactive. Pass -y with explicit flags, or run in an interactive terminal.",
    );
    return 2;
  }

  let resolved;
  try {
    resolved = await resolveOptions(flags, cwd);
  } catch (err) {
    if (err instanceof UsageError) {
      console.error(`error: ${err.message}`);
      return 2;
    }
    console.error(`error: ${String(err)}`);
    return 1;
  }

  if (resolved === null) return 0;

  const { facts, options } = resolved;
  const plan = buildPlan(facts, options);
  const applied = options.dryRun ? previewPlan(plan, options) : applyPlan(plan, options);

  let postActions: string[] = [];
  let postActionErrors: string[] = [];
  if (!options.dryRun && applied.errors.length === 0) {
    const post = runPostActions(facts, options);
    postActions = post.actions;
    postActionErrors = post.errors;
  }

  const report: ScaffoldReport = {
    facts,
    options,
    plan,
    applied,
    postActions,
    postActionErrors,
  };

  if (options.json) {
    console.log(JSON.stringify(toJsonReport(report, VERSION), null, 2));
  } else {
    printReport(report, VERSION);
  }

  return applied.errors.length > 0 || postActionErrors.length > 0 ? 1 : 0;
}

const VERSION = readVersion();

/** Build the commander program. */
function buildProgram(): Command {
  return new Command()
    .name("agent-spec-init")
    .description(
      "Add an AI agent development specification system to any repository.\n" +
        "Creates layered AGENTS.md instructions, Agent Notes decision records,\n" +
        "starter Skills, and machine-checkable documentation gates.",
    )
    .version(VERSION)
    .argument("[directory]", "target directory (default: current directory)")
    .option(
      "-t, --template <id>",
      "stack profile: auto, node, python, generic",
      "auto",
    )
    .option("--name <name>", "project name (default: detected from the repository)")
    .option("--lang <lang>", "documentation language: en or bilingual")
    .option("--pm <pm>", "package manager: npm, pnpm, or yarn")
    .option("--monorepo", "emit packages/AGENTS.md for a workspace repository")
    .option("--no-gates", "skip gate scripts (the generic profile never emits them)")
    .option("--no-skills", "skip starter skills")
    .option("--install", "install gate dependencies after scaffolding")
    .option("--git", "initialise a git repository when absent")
    .option("--dry-run", "print the plan without writing anything")
    .option("--json", "print a machine-readable report")
    .option("--force", "overwrite existing files")
    .option("-y, --yes", "accept every default and never prompt")
    .option("--skill-only", "install only the spec-init bootstrap skill")
    .option("-g, --global", "with --skill-only, install into the home directory")
    .addHelpText(
      "after",
      "\nProfiles:\n" +
        "  node     TypeScript gates, package.json scripts, tsconfig\n" +
        "  python   stdlib-only gates, no package manager required\n" +
        "  generic  specification core only, manual verification checklist\n" +
        "\nExamples:\n" +
        "  $ npx agent-spec-init . --yes\n" +
        "  $ npx agent-spec-init my-service --template node --pm pnpm --install\n" +
        "  $ npx agent-spec-init . --dry-run\n" +
        "  $ npx agent-spec-init --skill-only --global\n",
    );
}

/** Commander's option names map onto the internal flag names. */
function toFlags(directory: string | undefined, opts: Record<string, unknown>): CliFlags {
  return {
    directory,
    template: typeof opts.template === "string" ? opts.template : undefined,
    name: typeof opts.name === "string" ? opts.name : undefined,
    lang: typeof opts.lang === "string" ? opts.lang : undefined,
    pm: typeof opts.pm === "string" ? opts.pm : undefined,
    monorepo: opts.monorepo === true,
    gates: opts.gates !== false,
    skills: opts.skills !== false,
    install: opts.install === true,
    git: opts.git === true,
    dryRun: opts.dryRun === true,
    json: opts.json === true,
    force: opts.force === true,
    yes: opts.yes === true,
    skillOnly: opts.skillOnly === true,
    global: opts.global === true,
  };
}

/**
 * Parse arguments and execute.
 *
 * @param argv Arguments after the executable name.
 * @param cwd Working directory for relative targets.
 * @returns Process exit code.
 */
export async function main(argv: string[], cwd = process.cwd()): Promise<number> {
  const program = buildProgram();
  program.parse(argv, { from: "user" });
  const flags = toFlags(program.args[0], program.opts());
  return run(flags, cwd);
}
