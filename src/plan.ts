/**
 * Builds the complete, side-effect-free plan for a scaffold run.
 *
 * Planning is separate from writing so `--dry-run` and the tests can inspect
 * exactly what a run would produce without touching the target repository.
 */

import { renderTemplate, normalizeText, type TemplateVars } from "./render.js";
import { buildVars, getProfile, type ProfileContext } from "./profiles.js";
import type {
  InitOptions,
  PlannedFile,
  PlannedJsonUpdate,
  ProjectFacts,
  ScaffoldPlan,
} from "./types.js";

/** Lifecycle folders under `.agents/notes/`. */
const LIFECYCLES = ["proposed", "implemented", "rejected"] as const;

/** Classification folders every lifecycle carries. */
const NOTE_CLASSES = [
  "architecture",
  "process",
  "testing",
  "feature",
  "bug-fix",
  "simplification",
] as const;

/** Core documents emitted for every profile. */
const CORE_DOCUMENTS: Array<{ template: string; target: string }> = [
  { template: "core/agents-md/root.md", target: "AGENTS.md" },
  { template: "core/agents-md/docs.md", target: "docs/AGENTS.md" },
  { template: "core/docs/architecture.md", target: "docs/architecture.md" },
  { template: "core/docs/development.md", target: "docs/development.md" },
  { template: "core/docs/testing.md", target: "docs/testing.md" },
  {
    template: "core/docs/defensive-patterns.md",
    target: "docs/defensive-patterns.md",
  },
  { template: "core/docs/cookbook.md", target: "docs/cookbook/README.md" },
  { template: "core/docs/postmortem.md", target: "docs/postmortem/README.md" },
  { template: "core/notes/README.md", target: ".agents/notes/README.md" },
  { template: "core/agents-md/notes.md", target: ".agents/notes/AGENTS.md" },
  {
    template: "core/notes/archived-agents.md",
    target: ".agents/notes/archived/AGENTS.md",
  },
];

/** Starter skills; none reference tooling the target may not have. */
const CORE_SKILLS: Array<{ template: string; target: string }> = [
  { template: "core/skills/code-review.md", target: ".agents/skills/code-review/SKILL.md" },
  {
    template: "core/skills/prose-standard.md",
    target: ".agents/skills/prose-standard/SKILL.md",
  },
  {
    template: "core/skills/pre-push-checks.md",
    target: ".agents/skills/pre-push-checks/SKILL.md",
  },
];

/** Documents under `packages/` for workspace repositories. */
const MONOREPO_DOCUMENTS: Array<{ template: string; target: string }> = [
  { template: "core/agents-md/packages.md", target: "packages/AGENTS.md" },
  { template: "core/docs/packages-readme.md", target: "packages/README.md" },
];

/** Standing-document word budgets written to the target manifest. */
const DOCUMENT_BUDGETS: Record<string, number> = {
  "AGENTS.md": 1200,
  "docs/AGENTS.md": 1100,
  "docs/architecture.md": 700,
  "docs/development.md": 750,
  "docs/testing.md": 850,
  "docs/defensive-patterns.md": 700,
  "docs/cookbook/README.md": 140,
  "docs/postmortem/README.md": 140,
  "packages/AGENTS.md": 550,
  "packages/README.md": 450,
};

/** Scripts installed into package.json for the Node profile. */
const NODE_GATE_SCRIPTS: Record<string, string> = {
  "verify-agent-note-format": "tsx scripts/verify-agent-note-format.ts",
  "verify-agent-note-classification":
    "tsx scripts/verify-agent-note-classification.ts",
  "verify-md-links": "tsx scripts/verify-md-links.ts",
  "verify-md-wrap": "tsx scripts/verify-md-wrap.ts",
  "verify-doc-budgets": "tsx scripts/verify-doc-budgets.ts",
  "verify-export-jsdoc": "tsx scripts/verify-export-jsdoc.ts",
  "doc-sync": "tsx scripts/run-gates.ts doc-sync",
  "test:docs": "tsx scripts/run-gates.ts doc-quick",
};

/** Paths whose content must not end in a normalized newline. */
function isMarkerPath(path: string): boolean {
  return path.endsWith(".gitkeep");
}

/**
 * Build the template variables shared by every emitted document.
 *
 * @param facts Detected project facts.
 * @param options Resolved CLI options.
 * @returns Placeholder values, including profile-supplied prose blocks.
 */
export function buildTemplateVars(
  facts: ProjectFacts,
  options: InitOptions,
): TemplateVars {
  const profile = getProfile(options.template);
  const vars = buildVars(facts, options);
  const ctx: ProfileContext = { facts, options, vars };
  const gates = options.includeGates;

  return {
    ...vars,
    LAYOUT: profile.layout(ctx),
    COMMANDS: profile.commands(ctx),
    CONVENTIONS: profile.conventions(ctx),
    VERIFICATION: profile.verification(ctx),
    DOCUMENTATION_RULE: profile.documentationRule(ctx),
    CHECK_TABLE: profile.checkTable(ctx),
    PREREQUISITES: profile.prerequisites(ctx),
    SETUP: profile.setup(ctx),
    CI_STATUS: profile.ciStatus(ctx),
    TIERS: profile.tiers(ctx),
    ARCHITECTURE_OVERVIEW: profile.architectureOverview(ctx),
    MODULE_MAP: profile.moduleMap(ctx),
    DATA_FLOW: profile.dataFlow(ctx),
    EXTENSION_POINTS: profile.extensionPoints(ctx),
    DOC_GATE: gates
      ? `\`${vars.DOC_SYNC_CMD}\``
      : "the manual checklist in [testing.md](testing.md)",
    LINK_GATE: gates
      ? `\`${vars.DOC_SYNC_CMD}\``
      : "A manual review pass",
    GATE_STEP: gates
      ? `4. Run \`${vars.DOC_SYNC_CMD}\` and fix every violation before writing the pull request.`
      : "4. Apply the manual checklist in [testing.md](testing.md) before writing the pull request.",
    REVIEW_STEP: gates
      ? `run \`${vars.DOC_SYNC_CMD}\`.`
      : "apply the manual checklist in [docs/testing.md](../../../docs/testing.md).",
  };
}

/** Build the manifest of standing-document budgets for emitted files. */
function buildBudgets(files: PlannedFile[], monorepo: boolean): string {
  const emitted = new Set(files.map((file) => file.path));
  const manifest: Record<string, number> = {};
  for (const [path, ceiling] of Object.entries(DOCUMENT_BUDGETS)) {
    if (emitted.has(path)) manifest[path] = ceiling;
  }
  if (!monorepo) {
    delete manifest["packages/AGENTS.md"];
    delete manifest["packages/README.md"];
  }
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * Plan every file and manifest update for a run.
 *
 * @param facts Detected project facts.
 * @param options Resolved CLI options.
 * @returns Files to write, including empty directory markers.
 * @throws Error when a bundled template is missing or leaves a placeholder.
 */
export function buildPlan(
  facts: ProjectFacts,
  options: InitOptions,
): ScaffoldPlan {
  const profile = getProfile(options.template);
  const vars = buildTemplateVars(facts, options);
  const files: PlannedFile[] = [];

  const add = (target: string, template: string): void => {
    const content = renderTemplate(template, vars);
    files.push({ path: target, content, source: template });
  };

  // Skill-only installs carry the bootstrap skill and nothing else.
  if (options.skillOnly) {
    files.push({
      path: ".agents/skills/spec-init/SKILL.md",
      content: renderTemplate("core/skills/spec-init.md", vars),
      source: "core/skills/spec-init.md",
    });
    return { files, jsonUpdates: [] };
  }

  for (const doc of CORE_DOCUMENTS) add(doc.target, doc.template);

  if (options.includeSkills) {
    for (const skill of CORE_SKILLS) add(skill.target, skill.template);
  }

  if (options.monorepo) {
    for (const doc of MONOREPO_DOCUMENTS) add(doc.target, doc.template);
  }

  for (const lifecycle of LIFECYCLES) {
    for (const noteClass of NOTE_CLASSES) {
      files.push({
        path: `.agents/notes/${lifecycle}/${noteClass}/.gitkeep`,
        content: "",
        source: "generated",
      });
    }
  }
  for (const noteClass of NOTE_CLASSES) {
    files.push({
      path: `.agents/notes/archived/${noteClass}/.gitkeep`,
      content: "",
      source: "generated",
    });
  }

  if (options.includeGates) {
    for (const file of profile.gateFiles) add(file.target, file.template);
    for (const file of profile.configFiles) add(file.target, file.template);
    files.push({
      path: "scripts/doc-budgets.manifest.json",
      content: buildBudgets(files, options.monorepo),
      source: "generated",
    });
  }

  const normalized = files.map((file) => ({
    ...file,
    content: isMarkerPath(file.path) ? "" : normalizeText(file.content),
  }));

  const jsonUpdates: PlannedJsonUpdate[] = [];
  if (options.template === "node" && options.includeGates) {
    jsonUpdates.push({
      path: "package.json",
      scripts: NODE_GATE_SCRIPTS,
      devDependencies: { tsx: "^4.19.0", typescript: "^5.7.0" },
      createOnly: {
        name: options.projectName,
        version: "0.1.0",
        private: true,
        type: "module",
      },
    });
  }

  return { files: normalized, jsonUpdates };
}
