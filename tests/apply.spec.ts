/**
 * Applying a plan: creation, safe conflicts, and manifest merging.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyPlan, previewPlan } from "../src/apply.js";
import { buildPlan } from "../src/plan.js";
import type { InitOptions, ScaffoldPlan } from "../src/types.js";
import { factsFor, optionsFor, removeDir, tempDir, writeFile } from "./helpers.js";

describe("applyPlan", () => {
  let dir: string;
  let options: InitOptions;
  let plan: ScaffoldPlan;

  beforeEach(() => {
    dir = tempDir();
    options = optionsFor(dir, "node");
    plan = buildPlan(factsFor(dir, "node"), options);
  });

  afterEach(() => {
    removeDir(dir);
  });

  it("writes every planned file and creates the target directory", () => {
    const result = applyPlan(plan, options);

    expect(result.errors).toEqual([]);
    expect(result.files.every((file) => file.action === "created")).toBe(true);
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(dir, "docs", "architecture.md"))).toBe(true);
    expect(existsSync(join(dir, ".agents", "notes", "proposed", "feature", ".gitkeep"))).toBe(true);
  });

  it("reports a second run as unchanged", () => {
    applyPlan(plan, options);
    const second = applyPlan(plan, options);

    expect(second.files.every((file) => file.action === "unchanged")).toBe(true);
    expect(second.jsonUpdates[0]?.changed).toBe(false);
  });

  it("keeps a differing file unless force is set", () => {
    writeFile(dir, "AGENTS.md", "# Hand-written rules\n");

    const kept = applyPlan(plan, options);
    expect(kept.files.find((file) => file.path === "AGENTS.md")?.action).toBe("kept");
    expect(readFileSync(join(dir, "AGENTS.md"), "utf-8")).toBe("# Hand-written rules\n");

    const forced = applyPlan(plan, { ...options, force: true });
    expect(forced.files.find((file) => file.path === "AGENTS.md")?.action).toBe("overwritten");
    expect(readFileSync(join(dir, "AGENTS.md"), "utf-8")).toContain("test-app");
  });

  it("merges package.json without dropping existing entries", () => {
    writeFile(
      dir,
      "package.json",
      `${JSON.stringify(
        {
          name: "existing-app",
          scripts: { test: "vitest run", "doc-sync": "custom-tool" },
          devDependencies: { tsx: "^4.0.0", custom: "1.2.3" },
        },
        null,
        2,
      )}\n`,
    );

    const result = applyPlan(plan, options);
    const merged = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8")) as {
      name: string;
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(result.errors).toEqual([]);
    expect(merged.name).toBe("existing-app");
    expect(merged.scripts.test).toBe("vitest run");
    expect(merged.scripts["verify-md-links"]).toBe("tsx scripts/verify-md-links.ts");
    expect(merged.scripts["doc-sync"]).toBe("custom-tool");
    expect(merged.devDependencies.custom).toBe("1.2.3");
    expect(merged.devDependencies.tsx).toBe("^4.0.0");
    expect(result.jsonUpdates[0]?.keptKeys).toEqual(
      expect.arrayContaining(["scripts.doc-sync", "devDependencies.tsx"]),
    );
  });

  it("replaces a differing script when force is set", () => {
    writeFile(dir, "package.json", JSON.stringify({ name: "x", scripts: { "doc-sync": "old" } }));

    applyPlan(plan, { ...options, force: true });
    const merged = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8")) as {
      scripts: Record<string, string>;
    };

    expect(merged.scripts["doc-sync"]).toBe("tsx scripts/run-gates.ts doc-sync");
  });

  it("fails loud on an invalid package.json instead of overwriting it", () => {
    writeFile(dir, "package.json", "{ not json");

    const result = applyPlan(plan, options);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("not valid JSON");
    expect(readFileSync(join(dir, "package.json"), "utf-8")).toBe("{ not json");
  });
});

describe("previewPlan", () => {
  it("writes nothing and predicts creation", () => {
    const dir = tempDir();
    const options = optionsFor(dir, "python");
    const plan = buildPlan(factsFor(dir, "python"), options);

    const preview = previewPlan(plan, options);

    expect(preview.files.every((file) => file.action === "created")).toBe(true);
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(false);
    expect(existsSync(join(dir, "scripts"))).toBe(false);

    removeDir(dir);
  });
});
