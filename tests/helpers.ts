/**
 * Shared fixtures for the test suite.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emptyFacts } from "../src/detect.js";
import type { InitOptions, ProjectFacts, TemplateId } from "../src/types.js";

/** Repository root, used to locate the local tsx executable. */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Create a disposable directory. */
export function tempDir(prefix = "asi-test-"): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Delete a disposable directory. */
export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/** Write a file, creating parent directories. */
export function writeFile(root: string, relativePath: string, content: string): void {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf-8");
}

/** Options with every required field set for a fixture run. */
export function optionsFor(
  targetDir: string,
  template: TemplateId,
  overrides: Partial<InitOptions> = {},
): InitOptions {
  return {
    targetDir,
    projectName: "test-app",
    template,
    packageManager: "npm",
    bilingual: false,
    includeGates: template !== "generic",
    includeSkills: true,
    monorepo: false,
    force: false,
    dryRun: false,
    install: false,
    git: false,
    json: false,
    skillOnly: false,
    global: false,
    yes: true,
    ...overrides,
  };
}

/** Facts for a fixture repository, without touching the disk. */
export function factsFor(
  root: string,
  template: TemplateId,
  overrides: Partial<ProjectFacts> = {},
): ProjectFacts {
  return {
    ...emptyFacts(root),
    projectName: "test-app",
    template,
    sourceDirs: template === "generic" ? [] : ["src"],
    ...overrides,
  };
}

/**
 * Run one generated gate through the repository's tsx.
 *
 * The generated project has no installed dependencies in tests, so tsx runs
 * from this repository while the gate resolves its files from `cwd`.
 */
export function runNodeGate(
  cwd: string,
  script: string,
): { status: number | null; output: string } {
  const tsxCli = join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  const result = spawnSync(
    process.execPath,
    [tsxCli, join("scripts", script)],
    { cwd, encoding: "utf-8" },
  );
  return { status: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

/** Locate a working Python 3 interpreter, or null when none is installed. */
export function pythonCommand(): string | null {
  const candidates =
    process.platform === "win32" ? ["python", "python3"] : ["python3", "python"];
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["--version"], { encoding: "utf-8" });
    if (probe.status === 0) return candidate;
  }
  return null;
}

/** Run the generated Python gate script. */
export function runPythonGates(
  cwd: string,
  interpreter: string,
  mode: string,
): { status: number | null; output: string } {
  const result = spawnSync(interpreter, ["scripts/doc_gates.py", mode], {
    cwd,
    encoding: "utf-8",
  });
  return { status: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}
