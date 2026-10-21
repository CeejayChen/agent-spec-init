/**
 * CLI behavior: flag validation, detection-driven defaults, dry runs, and the
 * machine-readable report agents consume.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli.js";
import { resolveOptions } from "../src/options.js";
import { UsageError } from "../src/types.js";
import { removeDir, tempDir, writeFile } from "./helpers.js";

/** Capture console output produced by a CLI run. */
function captureConsole(): { logs: string[]; errors: string[]; restore: () => void } {
  const logs: string[] = [];
  const errors: string[] = [];
  const logSpy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  });
  const errorSpy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  });
  return {
    logs,
    errors,
    restore: () => {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    },
  };
}

describe("resolveOptions", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(() => {
    removeDir(dir);
  });

  it("derives the template, name, and package manager from the repository", async () => {
    writeFile(dir, "package.json", JSON.stringify({ name: "api-service" }));
    writeFile(dir, "pnpm-lock.yaml", "lockfileVersion: '9.0'\n");

    const resolved = await resolveOptions({ directory: dir, yes: true }, dir);

    expect(resolved?.options.template).toBe("node");
    expect(resolved?.options.projectName).toBe("api-service");
    expect(resolved?.options.packageManager).toBe("pnpm");
    expect(resolved?.options.includeGates).toBe(true);
  });

  it("accepts an explicit template override", async () => {
    writeFile(dir, "package.json", JSON.stringify({ name: "api-service" }));

    const resolved = await resolveOptions(
      { directory: dir, yes: true, template: "generic" },
      dir,
    );

    expect(resolved?.options.template).toBe("generic");
    expect(resolved?.options.includeGates).toBe(false);
  });

  it("rejects an unsupported template", async () => {
    await expect(
      resolveOptions({ directory: dir, yes: true, template: "rust" }, dir),
    ).rejects.toBeInstanceOf(UsageError);
  });

  it("rejects an unsupported package manager", async () => {
    await expect(
      resolveOptions({ directory: dir, yes: true, pm: "bun" }, dir),
    ).rejects.toBeInstanceOf(UsageError);
  });

  it("rejects --global without --skill-only", async () => {
    await expect(
      resolveOptions({ directory: dir, yes: true, global: true }, dir),
    ).rejects.toThrow(/--global requires --skill-only/);
  });

  it("skips prompts for a skill-only install", async () => {
    const resolved = await resolveOptions({ directory: dir, skillOnly: true }, dir);

    expect(resolved?.options.skillOnly).toBe(true);
    expect(resolved?.options.includeGates).toBe(false);
  });

  it("honours --lang bilingual", async () => {
    const resolved = await resolveOptions(
      { directory: dir, yes: true, lang: "bilingual" },
      dir,
    );

    expect(resolved?.options.bilingual).toBe(true);
  });
});

describe("main", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(() => {
    removeDir(dir);
  });

  it("previews with --dry-run and writes nothing", async () => {
    writeFile(dir, "pyproject.toml", '[project]\nname = "sample"\n');
    const output = captureConsole();

    const code = await main([dir, "--dry-run", "--json", "-y"], dir);

    output.restore();
    const payload = JSON.parse(output.logs.join("\n")) as {
      dryRun: boolean;
      profile: string;
      files: { created: string[] };
    };

    expect(code).toBe(0);
    expect(payload.dryRun).toBe(true);
    expect(payload.profile).toBe("python");
    expect(payload.files.created).toContain("AGENTS.md");
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(false);
  });

  it("creates a new directory for a create-style invocation", async () => {
    const target = join(dir, "new-service");
    const output = captureConsole();

    const code = await main([target, "--template", "generic", "--json", "-y"], dir);

    output.restore();
    expect(code).toBe(0);
    expect(existsSync(join(target, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(target, "scripts"))).toBe(false);
  });

  it("exits 2 for an unsupported template", async () => {
    const output = captureConsole();

    const code = await main([dir, "--template", "cobol", "-y"], dir);

    output.restore();
    expect(code).toBe(2);
    expect(output.errors.join("\n")).toContain("Unsupported --template");
  });

  it("reports kept files and next steps after a real run", async () => {
    writeFile(dir, "AGENTS.md", "# Hand-written\n");
    const output = captureConsole();

    const code = await main([dir, "--template", "generic", "--json", "-y"], dir);

    output.restore();
    const payload = JSON.parse(output.logs.join("\n")) as {
      files: { kept: string[] };
      nextSteps: string[];
      needsAttention: string[];
    };

    expect(code).toBe(0);
    expect(payload.files.kept).toContain("AGENTS.md");
    expect(payload.nextSteps.join(" ")).toContain("kept files");
  });
});
