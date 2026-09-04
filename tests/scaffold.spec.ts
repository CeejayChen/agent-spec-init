/**
 * Tests for the scaffold engine.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scaffold, render } from "../src/scaffold.js";
import type { InitOptions } from "../src/prompts.js";

function defaultOptions(overrides?: Partial<InitOptions>): InitOptions {
  return {
    projectName: "test-project",
    bilingual: false,
    packageManager: "pnpm",
    includeGates: true,
    includeSkills: true,
    force: false,
    ...overrides,
  };
}

describe("render", () => {
  it("replaces {{VAR}} placeholders", () => {
    const result = render("Hello {{NAME}}, welcome to {{PROJECT}}!", {
      NAME: "Alice",
      PROJECT: "TestProj",
    } as any);
    expect(result).toBe("Hello Alice, welcome to TestProj!");
  });

  it("leaves unknown placeholders intact", () => {
    const result = render("Value: {{UNKNOWN}}", {} as any);
    expect(result).toBe("Value: {{UNKNOWN}}");
  });
});

describe("scaffold", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "agent-spec-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates root AGENTS.md with project name", () => {
    const result = scaffold(tmpDir, defaultOptions());
    const agentsMd = readFileSync(join(tmpDir, "AGENTS.md"), "utf-8");
    expect(agentsMd).toContain("TEST PROJECT");
    expect(result.errors).toHaveLength(0);
  });

  it("creates docs/ structure", () => {
    scaffold(tmpDir, defaultOptions());
    expect(existsSync(join(tmpDir, "docs", "AGENTS.md"))).toBe(true);
    expect(existsSync(join(tmpDir, "docs", "architecture.md"))).toBe(true);
    expect(existsSync(join(tmpDir, "docs", "development.md"))).toBe(true);
    expect(existsSync(join(tmpDir, "docs", "defensive-patterns.md"))).toBe(true);
    expect(existsSync(join(tmpDir, "docs", "testing.md"))).toBe(true);
  });

  it("creates .agents/notes/ lifecycle structure", () => {
    scaffold(tmpDir, defaultOptions());
    expect(existsSync(join(tmpDir, ".agents", "notes", "README.md"))).toBe(true);
    expect(existsSync(join(tmpDir, ".agents", "notes", "AGENTS.md"))).toBe(true);

    // Check lifecycle/class directories
    for (const lifecycle of ["proposed", "implemented", "rejected"]) {
      for (const cls of ["architecture", "process", "testing", "feature", "bug-fix", "simplification"]) {
        expect(existsSync(join(tmpDir, ".agents", "notes", lifecycle, cls, ".gitkeep"))).toBe(true);
      }
    }

    // Check archived
    expect(existsSync(join(tmpDir, ".agents", "notes", "archived", "AGENTS.md"))).toBe(true);
  });

  it("creates skills when includeSkills is true", () => {
    scaffold(tmpDir, defaultOptions({ includeSkills: true }));
    expect(existsSync(join(tmpDir, ".agents", "skills", "code-review", "SKILL.md"))).toBe(true);
    expect(existsSync(join(tmpDir, ".agents", "skills", "prose-standard", "SKILL.md"))).toBe(true);
    expect(existsSync(join(tmpDir, ".agents", "skills", "pre-push-checks", "SKILL.md"))).toBe(true);
  });

  it("skips skills when includeSkills is false", () => {
    scaffold(tmpDir, defaultOptions({ includeSkills: false }));
    expect(existsSync(join(tmpDir, ".agents", "skills"))).toBe(false);
  });

  it("creates verify gates when includeGates is true", () => {
    scaffold(tmpDir, defaultOptions({ includeGates: true }));
    expect(existsSync(join(tmpDir, "scripts", "verify-agent-note-format.ts"))).toBe(true);
    expect(existsSync(join(tmpDir, "scripts", "verify-md-links.ts"))).toBe(true);
    expect(existsSync(join(tmpDir, "scripts", "verify-doc-budgets.ts"))).toBe(true);
    expect(existsSync(join(tmpDir, "scripts", "run-gates.ts"))).toBe(true);
    expect(existsSync(join(tmpDir, "scripts", "doc-budgets.manifest.json"))).toBe(true);
  });

  it("skips gates when includeGates is false", () => {
    scaffold(tmpDir, defaultOptions({ includeGates: false }));
    expect(existsSync(join(tmpDir, "scripts"))).toBe(false);
  });

  it("updates package.json with verify scripts", () => {
    scaffold(tmpDir, defaultOptions());
    const pkg = JSON.parse(readFileSync(join(tmpDir, "package.json"), "utf-8"));
    expect(pkg.scripts["verify-agent-note-format"]).toBeDefined();
    expect(pkg.scripts["doc-sync"]).toBeDefined();
    expect(pkg.devDependencies["tsx"]).toBeDefined();
  });

  it("respects bilingual header", () => {
    scaffold(tmpDir, defaultOptions({ bilingual: true }));
    const arch = readFileSync(join(tmpDir, "docs", "architecture.md"), "utf-8");
    expect(arch).toContain("English | [中文]");
  });

  it("skips existing files when force is false", () => {
    scaffold(tmpDir, defaultOptions());
    const result2 = scaffold(tmpDir, defaultOptions());
    expect(result2.skipped.length).toBeGreaterThan(0);
    expect(result2.created).toHaveLength(0);
  });

  it("overwrites existing files when force is true", () => {
    scaffold(tmpDir, defaultOptions());
    const result2 = scaffold(tmpDir, defaultOptions({ force: true }));
    expect(result2.created.length).toBeGreaterThan(0);
    expect(result2.skipped).toHaveLength(0);
  });

  it("uses correct package manager in templates", () => {
    scaffold(tmpDir, defaultOptions({ packageManager: "npm" }));
    const agentsMd = readFileSync(join(tmpDir, "AGENTS.md"), "utf-8");
    expect(agentsMd).toContain("npm run");
    expect(agentsMd).not.toContain("pnpm run");
  });
});
