#!/usr/bin/env tsx
/**
 * verify-templates — the bundling gate for this scaffolder.
 *
 * Renders every stack profile through the real planner and checks that:
 * - no rendered file still contains a `{{PLACEHOLDER}}`;
 * - every documented file ends with exactly one newline;
 * - every generated document stays inside its own budget manifest;
 * - every bundled template is used by at least one profile;
 * - the bundled spec-init skill matches the repository copy byte for byte.
 *
 * Usage: tsx scripts/verify-templates.ts
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emptyFacts } from "../src/detect.js";
import { buildPlan } from "../src/plan.js";
import type { InitOptions, ProjectFacts, ScaffoldPlan, TemplateId } from "../src/types.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const TEMPLATES = join(ROOT, "src", "templates");
const PLACEHOLDER = /\{\{[A-Z0-9_]+\}\}/;

const errors: string[] = [];

/** Options for a fixture run. */
function optionsFor(
  template: TemplateId,
  overrides: Partial<InitOptions> = {},
): InitOptions {
  return {
    targetDir: ROOT,
    projectName: "verify-fixture",
    template,
    packageManager: "pnpm",
    bilingual: true,
    includeGates: template !== "generic",
    includeSkills: true,
    monorepo: true,
    force: false,
    dryRun: true,
    install: false,
    git: false,
    json: false,
    skillOnly: false,
    global: false,
    yes: true,
    ...overrides,
  };
}

/** Facts for a populated Node repository. */
const nodeFacts: ProjectFacts = {
  ...emptyFacts(ROOT),
  projectName: "verify-fixture",
  template: "node",
  packageManager: "pnpm",
  packageManagerSource: "lockfile",
  monorepo: true,
  hasGit: true,
  hasCi: true,
  sourceDirs: ["src"],
  nodeScripts: { test: "vitest", lint: "eslint", typecheck: "tsc", build: "tsc" },
  hasPackageJson: true,
  hasTsconfig: true,
  hasTestsDir: true,
  bilingualDocs: true,
};

/** Facts for a populated Python repository. */
const pythonFacts: ProjectFacts = {
  ...emptyFacts(ROOT),
  projectName: "verify-fixture",
  template: "python",
  monorepo: true,
  hasGit: true,
  hasCi: true,
  sourceDirs: ["src"],
  hasPyProject: true,
  hasTestsDir: true,
  hasPytest: true,
  bilingualDocs: true,
};

/** Facts for a repository with no supported toolchain. */
const genericFacts: ProjectFacts = {
  ...emptyFacts(ROOT),
  projectName: "verify-fixture",
  template: "generic",
  sourceDirs: ["app"],
};

interface Variant {
  label: string;
  plan: ScaffoldPlan;
}

const variants: Variant[] = [
  { label: "node (gates, skills, monorepo)", plan: buildPlan(nodeFacts, optionsFor("node")) },
  {
    label: "node (no gates, no skills)",
    plan: buildPlan(nodeFacts, optionsFor("node", { includeGates: false, includeSkills: false })),
  },
  { label: "python", plan: buildPlan(pythonFacts, optionsFor("python")) },
  {
    label: "python (no gates)",
    plan: buildPlan(pythonFacts, optionsFor("python", { includeGates: false })),
  },
  { label: "generic", plan: buildPlan(genericFacts, optionsFor("generic")) },
  {
    label: "skill-only",
    plan: buildPlan(nodeFacts, optionsFor("node", { skillOnly: true, includeGates: false })),
  },
];

const referenced = new Set<string>();

for (const variant of variants) {
  for (const file of variant.plan.files) {
    if (file.source !== "generated") referenced.add(file.source);

    if (PLACEHOLDER.test(file.content)) {
      errors.push(`${variant.label}: ${file.path} still contains a placeholder`);
    }

    if (!file.path.endsWith(".gitkeep")) {
      if (!file.content.endsWith("\n") || file.content.endsWith("\n\n")) {
        errors.push(`${variant.label}: ${file.path} must end with exactly one newline`);
      }
    }
  }

  const manifestFile = variant.plan.files.find(
    (file) => file.path === "scripts/doc-budgets.manifest.json",
  );
  if (manifestFile === undefined) continue;

  const budgets = JSON.parse(manifestFile.content) as Record<string, number>;
  for (const [path, ceiling] of Object.entries(budgets)) {
    const planned = variant.plan.files.find((file) => file.path === path);
    if (planned === undefined) {
      errors.push(`${variant.label}: budget manifest lists ${path} but the plan omits it`);
      continue;
    }
    const words = planned.content.split(/\s+/).filter((word) => word.length > 0).length;
    if (words > ceiling) {
      errors.push(
        `${variant.label}: ${path} is ${words} words, over its ${ceiling}-word budget`,
      );
    }
  }
}

/** Every file under `src/templates`, relative with forward slashes. */
function walkTemplates(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      found.push(...walkTemplates(fullPath));
    } else {
      found.push(relative(TEMPLATES, fullPath).replace(/\\/g, "/"));
    }
  }
  return found;
}

for (const template of walkTemplates(TEMPLATES)) {
  if (!referenced.has(template)) {
    errors.push(`bundled template is unused by every profile: ${template}`);
  }
}

const bundledSkill = join(TEMPLATES, "core", "skills", "spec-init.md");
const repositorySkill = join(ROOT, ".agents", "skills", "spec-init", "SKILL.md");
if (readFileSync(bundledSkill, "utf-8") !== readFileSync(repositorySkill, "utf-8")) {
  errors.push(
    "core/skills/spec-init.md differs from .agents/skills/spec-init/SKILL.md; copy one to the other",
  );
}

if (errors.length > 0) {
  for (const error of errors) console.error(`  ❌ ${error}`);
  console.error(`\n❌ verify-templates: ${errors.length} error(s)`);
  process.exit(1);
}

console.log(
  `✅ verify-templates: ${variants.length} variants, ${referenced.size} templates rendered`,
);
