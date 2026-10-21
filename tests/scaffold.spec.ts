/**
 * End-to-end scaffolds: real files, real gates, and negative controls that
 * prove a gate can still fail.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scaffold } from "../src/index.js";
import { resolveOptions } from "../src/options.js";
import type { ScaffoldReport } from "../src/types.js";
import {
  optionsFor,
  pythonCommand,
  removeDir,
  runNodeGate,
  runPythonGates,
  tempDir,
  writeFile,
} from "./helpers.js";

const NODE_GATES = [
  "verify-agent-note-format.ts",
  "verify-agent-note-classification.ts",
  "verify-md-links.ts",
  "verify-md-wrap.ts",
  "verify-doc-budgets.ts",
  "verify-export-jsdoc.ts",
];

/** Every file the run wrote, as paths and contents. */
function writtenFiles(report: ScaffoldReport): Array<{ path: string; content: string }> {
  return report.applied.files.map((file) => ({
    path: file.path,
    content: readFileSync(join(report.options.targetDir, file.path), "utf-8"),
  }));
}

describe("node scaffold", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) removeDir(dir);
  });

  it(
    "produces a project whose own gates pass",
    async () => {
      const dir = tempDir();
      dirs.push(dir);
      writeFile(
        dir,
        "package.json",
        JSON.stringify({ name: "smoke-app", scripts: { test: "vitest run" }, type: "module" }),
      );
      writeFile(dir, "tsconfig.json", "{}");
      writeFile(dir, "src/index.ts", "export const value = 1;\n");

      const resolved = await resolveOptions({ directory: dir, yes: true }, dir);
      const report = scaffold(resolved!.options);

      expect(report.applied.errors).toEqual([]);
      expect(readFileSync(join(dir, "AGENTS.md"), "utf-8")).toContain("smoke-app");

      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8")) as {
        scripts: Record<string, string>;
      };
      expect(pkg.scripts["doc-sync"]).toBe("tsx scripts/run-gates.ts doc-sync");

      for (const file of writtenFiles(report)) {
        expect(/\{\{[A-Z0-9_]+\}\}/.test(file.content), file.path).toBe(false);
      }

      for (const gate of NODE_GATES) {
        const result = runNodeGate(dir, gate);
        expect(result.status, `${gate}\n${result.output}`).toBe(0);
      }
    },
    60_000,
  );

  it(
    "a wrapped paragraph turns the wrap gate red",
    () => {
      const dir = tempDir();
      dirs.push(dir);
      writeFile(dir, "package.json", JSON.stringify({ name: "smoke-app" }));
      scaffold(optionsFor(dir, "node"));

      writeFileSync(
        join(dir, "docs/architecture.md"),
        `${readFileSync(join(dir, "docs/architecture.md"), "utf-8")}This paragraph is wrapped\nacross two physical lines.\n`,
      );

      const result = runNodeGate(dir, "verify-md-wrap.ts");
      expect(result.status).toBe(1);
      expect(result.output).toContain("wrapped paragraph");
    },
    30_000,
  );

  it(
    "a malformed Agent Note turns the note gates red",
    () => {
      const dir = tempDir();
      dirs.push(dir);
      writeFile(dir, "package.json", JSON.stringify({ name: "smoke-app" }));
      scaffold(optionsFor(dir, "node"));
      writeFile(
        dir,
        ".agents/notes/implemented/process/2026-01-01-bad-note.md",
        "# Bad note\n\nStatus: implemented\n\n## Decision\n\nNo problem statement.\n",
      );

      const format = runNodeGate(dir, "verify-agent-note-format.ts");
      expect(format.status).toBe(1);
      expect(format.output).toContain("## Problem");
    },
    30_000,
  );
});

describe("python scaffold", () => {
  const dirs: string[] = [];
  const interpreter = pythonCommand();

  afterEach(() => {
    for (const dir of dirs.splice(0)) removeDir(dir);
  });

  it.skipIf(interpreter === null)(
    "produces a project whose stdlib gates pass and can fail",
    async () => {
      const dir = tempDir();
      dirs.push(dir);
      writeFile(dir, "pyproject.toml", '[project]\nname = "sample-service"\nversion = "0.1.0"\n');
      writeFile(dir, "src/sample/__init__.py", '"""Sample package."""\n');
      writeFile(dir, "tests/test_sample.py", "def test_ok():\n    assert True\n");

      const resolved = await resolveOptions({ directory: dir, yes: true }, dir);
      const report = scaffold(resolved!.options);

      expect(report.applied.errors).toEqual([]);
      expect(existsSync(join(dir, "scripts/doc_gates.py"))).toBe(true);
      expect(existsSync(join(dir, "scripts/verify-md-links.ts"))).toBe(false);
      expect(existsSync(join(dir, "package.json"))).toBe(false);
      expect(readFileSync(join(dir, "AGENTS.md"), "utf-8")).toContain("sample-service");

      const passing = runPythonGates(dir, interpreter!, "doc-sync");
      expect(passing.status, passing.output).toBe(0);

      writeFileSync(
        join(dir, "docs/testing.md"),
        `${readFileSync(join(dir, "docs/testing.md"), "utf-8")}A wrapped paragraph\nthat the gate must reject.\n`,
      );

      const failing = runPythonGates(dir, interpreter!, "verify-md-wrap");
      expect(failing.status).toBe(1);
      expect(failing.output).toContain("wrapped paragraph");
    },
    30_000,
  );
});

describe("scaffold safety", () => {
  it("is idempotent: a second run changes nothing", () => {
    const dir = tempDir();
    try {
      writeFile(dir, "package.json", JSON.stringify({ name: "smoke-app" }));
      scaffold(optionsFor(dir, "node"));

      const second = scaffold(optionsFor(dir, "node"));

      expect(second.applied.files.every((file) => file.action === "unchanged")).toBe(true);
      expect(second.applied.jsonUpdates.every((update) => update.changed === false)).toBe(true);
    } finally {
      removeDir(dir);
    }
  });

  it("never overwrites a hand-written AGENTS.md", () => {
    const dir = tempDir();
    try {
      writeFile(dir, "AGENTS.md", "# Our rules\n");
      const report = scaffold(optionsFor(dir, "generic"));

      expect(report.applied.files.find((file) => file.path === "AGENTS.md")?.action).toBe("kept");
      expect(readFileSync(join(dir, "AGENTS.md"), "utf-8")).toBe("# Our rules\n");
    } finally {
      removeDir(dir);
    }
  });

  it("emits the manual-checklist wording for the generic profile", () => {
    const dir = tempDir();
    try {
      const report = scaffold(optionsFor(dir, "generic"));
      const agents = readFileSync(join(dir, "AGENTS.md"), "utf-8");

      expect(report.applied.errors).toEqual([]);
      expect(agents).toContain("manual checklist");
      expect(existsSync(join(dir, "scripts"))).toBe(false);
    } finally {
      removeDir(dir);
    }
  });

  it("installs only the bootstrap skill with skillOnly", () => {
    const dir = tempDir();
    try {
      const report = scaffold(optionsFor(dir, "node", { skillOnly: true }));

      expect(report.applied.files).toHaveLength(1);
      expect(existsSync(join(dir, ".agents/skills/spec-init/SKILL.md"))).toBe(true);
      expect(existsSync(join(dir, "AGENTS.md"))).toBe(false);
    } finally {
      removeDir(dir);
    }
  });
});
