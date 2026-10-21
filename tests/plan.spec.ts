/**
 * Planning: the file set each profile emits, and the manifests it declares.
 */

import { describe, expect, it } from "vitest";
import { buildPlan } from "../src/plan.js";
import type { ProjectFacts, ScaffoldPlan } from "../src/types.js";
import { factsFor, optionsFor } from "./helpers.js";

const FIXTURE_ROOT = "/fixture";
const PLACEHOLDER = /\{\{[A-Z0-9_]+\}\}/;

/** Paths in a plan. */
function paths(plan: ScaffoldPlan): string[] {
  return plan.files.map((file) => file.path);
}

/** Word count used by the generated budget gate. */
function wordCount(content: string): number {
  return content.split(/\s+/).filter((word) => word.length > 0).length;
}

/** Assert every document in the plan fits the plan's own budget manifest. */
function expectBudgetsHold(plan: ScaffoldPlan): void {
  const manifest = plan.files.find((file) => file.path === "scripts/doc-budgets.manifest.json");
  expect(manifest).toBeDefined();
  const budgets = JSON.parse(manifest?.content ?? "{}") as Record<string, number>;
  for (const [path, ceiling] of Object.entries(budgets)) {
    const planned = plan.files.find((file) => file.path === path);
    expect(planned, `${path} is budgeted but not emitted`).toBeDefined();
    expect(wordCount(planned?.content ?? ""), `${path} word count`).toBeLessThanOrEqual(ceiling);
  }
}

describe("buildPlan", () => {
  it("emits the specification core for every profile", () => {
    for (const template of ["node", "python", "generic"] as const) {
      const plan = buildPlan(factsFor(FIXTURE_ROOT, template), optionsFor(FIXTURE_ROOT, template));
      expect(paths(plan)).toEqual(
        expect.arrayContaining([
          "AGENTS.md",
          "docs/AGENTS.md",
          "docs/architecture.md",
          "docs/development.md",
          "docs/testing.md",
          "docs/defensive-patterns.md",
          ".agents/notes/README.md",
          ".agents/skills/code-review/SKILL.md",
        ]),
      );
    }
  });

  it("leaves no placeholder in any rendered file", () => {
    for (const template of ["node", "python", "generic"] as const) {
      const plan = buildPlan(factsFor(FIXTURE_ROOT, template), optionsFor(FIXTURE_ROOT, template));
      for (const file of plan.files) {
        expect(PLACEHOLDER.test(file.content), `${template}: ${file.path}`).toBe(false);
      }
    }
  });

  it("adds TypeScript gates and a package.json merge for the node profile", () => {
    const plan = buildPlan(factsFor(FIXTURE_ROOT, "node"), optionsFor(FIXTURE_ROOT, "node"));

    expect(paths(plan)).toEqual(
      expect.arrayContaining([
        "scripts/run-gates.ts",
        "scripts/verify-md-links.ts",
        "scripts/tsconfig.scripts.json",
        "scripts/doc-budgets.manifest.json",
      ]),
    );
    expect(plan.jsonUpdates).toHaveLength(1);
    expect(plan.jsonUpdates[0]?.path).toBe("package.json");
    expect(plan.jsonUpdates[0]?.scripts["doc-sync"]).toBe("tsx scripts/run-gates.ts doc-sync");
    expect(plan.jsonUpdates[0]?.devDependencies).toHaveProperty("tsx");
    expect(plan.jsonUpdates[0]?.createOnly).toMatchObject({ name: "test-app", type: "module" });
  });

  it("adds only the stdlib gate script for the python profile", () => {
    const plan = buildPlan(factsFor(FIXTURE_ROOT, "python"), optionsFor(FIXTURE_ROOT, "python"));

    expect(paths(plan)).toContain("scripts/doc_gates.py");
    expect(paths(plan)).not.toContain("scripts/verify-md-links.ts");
    expect(paths(plan)).not.toContain("scripts/tsconfig.scripts.json");
    expect(plan.jsonUpdates).toHaveLength(0);
  });

  it("emits no gates for the generic profile", () => {
    const plan = buildPlan(factsFor(FIXTURE_ROOT, "generic"), optionsFor(FIXTURE_ROOT, "generic"));

    expect(paths(plan).some((path) => path.startsWith("scripts/"))).toBe(false);
    expect(plan.jsonUpdates).toHaveLength(0);
  });

  it("never emits gates when includeGates is false", () => {
    const plan = buildPlan(
      factsFor(FIXTURE_ROOT, "node"),
      optionsFor(FIXTURE_ROOT, "node", { includeGates: false }),
    );

    expect(paths(plan).some((path) => path.startsWith("scripts/"))).toBe(false);
    expect(plan.jsonUpdates).toHaveLength(0);
    const agents = plan.files.find((file) => file.path === "AGENTS.md");
    expect(agents?.content).toContain("manual checklist");
  });

  it("adds packages documentation only for a monorepo", () => {
    const facts: ProjectFacts = factsFor(FIXTURE_ROOT, "node", { monorepo: true });
    const plan = buildPlan(facts, optionsFor(FIXTURE_ROOT, "node", { monorepo: true }));
    const budgets = JSON.parse(
      plan.files.find((file) => file.path === "scripts/doc-budgets.manifest.json")?.content ?? "{}",
    ) as Record<string, number>;

    expect(paths(plan)).toEqual(expect.arrayContaining(["packages/AGENTS.md", "packages/README.md"]));
    expect(budgets).toHaveProperty("packages/README.md");
  });

  it("omits packages documentation for a single package", () => {
    const plan = buildPlan(factsFor(FIXTURE_ROOT, "node"), optionsFor(FIXTURE_ROOT, "node"));

    expect(paths(plan)).not.toContain("packages/AGENTS.md");
  });

  it("states the bilingual rule only when bilingual documentation is requested", () => {
    const plan = buildPlan(
      factsFor(FIXTURE_ROOT, "python"),
      optionsFor(FIXTURE_ROOT, "python", { bilingual: true }),
    );
    expect(plan.files.find((file) => file.path === "AGENTS.md")?.content).toContain(
      "bilingual",
    );
  });

  it("keeps every emitted document inside its own budget", () => {
    for (const template of ["node", "python"] as const) {
      expectBudgetsHold(
        buildPlan(
          factsFor(FIXTURE_ROOT, template, { monorepo: true }),
          optionsFor(FIXTURE_ROOT, template, { monorepo: true }),
        ),
      );
    }

    const generic = buildPlan(
      factsFor(FIXTURE_ROOT, "generic"),
      optionsFor(FIXTURE_ROOT, "generic"),
    );
    expect(generic.files.some((file) => file.path === "scripts/doc-budgets.manifest.json")).toBe(
      false,
    );
  });

  it("emits only the bootstrap skill in skill-only mode", () => {
    const plan = buildPlan(
      factsFor(FIXTURE_ROOT, "node"),
      optionsFor(FIXTURE_ROOT, "node", { skillOnly: true }),
    );

    expect(paths(plan)).toEqual([".agents/skills/spec-init/SKILL.md"]);
    expect(plan.files[0]?.content).toContain("agent-spec-init");
  });

  it("is deterministic", () => {
    const first = buildPlan(factsFor(FIXTURE_ROOT, "node"), optionsFor(FIXTURE_ROOT, "node"));
    const second = buildPlan(factsFor(FIXTURE_ROOT, "node"), optionsFor(FIXTURE_ROOT, "node"));

    expect(second).toEqual(first);
  });

  it("does not claim npm commands when no Node manifest will exist", () => {
    const plan = buildPlan(
      factsFor(FIXTURE_ROOT, "node"),
      optionsFor(FIXTURE_ROOT, "node", { includeGates: false }),
    );
    const agents = plan.files.find((file) => file.path === "AGENTS.md")?.content ?? "";

    expect(agents).not.toContain("npm install");
    expect(agents).toContain("No package.json or npm script is recorded yet");
  });

  it("describes real commands and the real layout", () => {
    const facts = factsFor(FIXTURE_ROOT, "node", {
      sourceDirs: ["src", "tools"],
      nodeScripts: { test: "vitest run", typecheck: "tsc --noEmit" },
    });
    const plan = buildPlan(facts, optionsFor(FIXTURE_ROOT, "node"));
    const agents = plan.files.find((file) => file.path === "AGENTS.md")?.content ?? "";

    expect(agents).toContain("npm run test");
    expect(agents).toContain("npm run typecheck");
    expect(agents).not.toContain("npm run lint");
    expect(agents).toContain("src/");
    expect(agents).toContain("tools/");
  });
});
