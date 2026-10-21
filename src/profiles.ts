/**
 * Stack profiles: the stack-specific half of every generated document.
 *
 * The core templates own the durable rules; a profile supplies the blocks that
 * name this repository's real layout, commands, and tooling. Prose here is
 * assembled from detected facts, so a Python repository never receives Node
 * commands and a repository without gates never claims to have them.
 */

import type { InitOptions, ProjectFacts, TemplateId } from "./types.js";
import type { TemplateVars } from "./render.js";

/** One bundled template and the path it is written to. */
export interface TemplateFile {
  template: string;
  target: string;
}

/** Inputs shared by every profile block builder. */
export interface ProfileContext {
  facts: ProjectFacts;
  options: InitOptions;
  vars: TemplateVars;
}

/** Everything a stack profile contributes to a scaffold run. */
export interface StackProfile {
  id: TemplateId;
  label: string;
  description: string;
  gateFiles: TemplateFile[];
  configFiles: TemplateFile[];
  /** Write a package.json when the target has none. */
  createsPackageJson: boolean;
  packageJsonScripts: Record<string, string>;
  devDependencies: Record<string, string>;
  installCommand: string | null;
  commands(ctx: ProfileContext): string;
  conventions(ctx: ProfileContext): string;
  layout(ctx: ProfileContext): string;
  verification(ctx: ProfileContext): string;
  documentationRule(ctx: ProfileContext): string;
  checkTable(ctx: ProfileContext): string;
  prerequisites(ctx: ProfileContext): string;
  setup(ctx: ProfileContext): string;
  ciStatus(ctx: ProfileContext): string;
  tiers(ctx: ProfileContext): string;
  architectureOverview(ctx: ProfileContext): string;
  moduleMap(ctx: ProfileContext): string;
  dataFlow(ctx: ProfileContext): string;
  extensionPoints(ctx: ProfileContext): string;
}

/** Render a Markdown bullet list. */
function bullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

/** Render a fenced shell block. */
function sh(lines: string[]): string {
  return ["```sh", ...lines, "```"].join("\n");
}

/** Render a fenced block of commands with aligned comments. */
function commandBlock(pairs: Array<[string, string]>): string {
  const width = Math.max(...pairs.map(([cmd]) => cmd.length)) + 2;
  return sh(pairs.map(([cmd, comment]) => `${cmd.padEnd(width)}# ${comment}`));
}

/** Layout rows built from the detected tree. */
function layoutRows(ctx: ProfileContext): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const sourceDirs = ctx.facts.sourceDirs.filter(
    (dir) => !(ctx.options.monorepo && dir === "packages"),
  );

  for (const dir of sourceDirs) {
    rows.push([`${dir}/`, "project source"]);
  }
  if (ctx.facts.hasTestsDir) {
    rows.push(["tests/", "test suites"]);
  }
  rows.push(["docs/", "architecture, testing, and documentation policy"]);
  rows.push([".agents/", "Agent Notes and Skills"]);
  if (ctx.options.includeGates) {
    rows.push(["scripts/", "verification gates"]);
  }
  if (ctx.options.monorepo) {
    rows.push(["packages/", "workspace packages"]);
  }
  return rows;
}

/** Universal rules every stack can honour. */
const UNIVERSAL_CONVENTIONS = [
  "**One home per fact.** Every fact lives in the document that owns it; every other mention links there.",
  "**Explicit over implicit.** A default is resolved in one visible step, never hidden in a fallback.",
  "**Fail loud.** Misconfiguration stops the run where it can first be detected; it never becomes a silent skip.",
  "**Docs move with the code.** A behavior change updates the document and the comments that state it in the same change.",
  "**Tests describe behavior.** Changed behavior changes its tests; an obsolete test is deleted with the behavior it pinned.",
  "**Comments state contracts, not reasoning.** Keep ownership, timing, failure, and consequence; delete narration and restatement.",
  "**No dead scaffolding.** Delete what nothing calls; an unused abstraction is a liability, not a head start.",
  "**Files end with exactly one trailing newline.**",
];

/** Python-specific rules. */
const PYTHON_CONVENTIONS = [
  "**Type hints on public functions and modules.** A hint that is wrong is a defect, not documentation.",
  "**Validate at the edges.** Config, files, network, and user input are untrusted; trust the types inside the process.",
  "**No mutable default arguments.** Use `None` and create the value inside the function.",
  "**No wildcard imports.** Import the name that is used so readers can find its owner.",
];

/** TypeScript-specific rules. */
const TYPE_SCRIPT_CONVENTIONS = [
  "**Strict TypeScript.** `strict: true` stays on; every remaining `any` states why the boundary cannot be typed.",
  "**Trust types inside the process; validate at its edges.** Config, files, network, and user input are untrusted.",
  "**Switch on discriminant tags.** A closed union ends in `assertNever`.",
  "**Brand ids that cross a boundary.** A bare `string` where an id is required invites mix-ups.",
];

/** Rules that apply to every stack regardless of language. */
const SHARED_SAFETY = [
  "**Catch blocks name what they swallow** and why nothing else can reach them.",
];

/** Node profile. */
const nodeProfile: StackProfile = {
  id: "node",
  label: "Node.js / TypeScript",
  description: "TypeScript gates run by tsx, package.json scripts, and tsconfig.",
  gateFiles: [
    { template: "node/scripts/agent-note-tree.ts", target: "scripts/agent-note-tree.ts" },
    { template: "node/scripts/repo-files.ts", target: "scripts/repo-files.ts" },
    {
      template: "node/scripts/verify-agent-note-format.ts",
      target: "scripts/verify-agent-note-format.ts",
    },
    {
      template: "node/scripts/verify-agent-note-classification.ts",
      target: "scripts/verify-agent-note-classification.ts",
    },
    { template: "node/scripts/verify-md-links.ts", target: "scripts/verify-md-links.ts" },
    { template: "node/scripts/verify-md-wrap.ts", target: "scripts/verify-md-wrap.ts" },
    {
      template: "node/scripts/verify-doc-budgets.ts",
      target: "scripts/verify-doc-budgets.ts",
    },
    {
      template: "node/scripts/verify-export-jsdoc.ts",
      target: "scripts/verify-export-jsdoc.ts",
    },
    { template: "node/scripts/run-gates.ts", target: "scripts/run-gates.ts" },
  ],
  configFiles: [
    {
      template: "node/config/tsconfig.scripts.json",
      target: "scripts/tsconfig.scripts.json",
    },
  ],
  createsPackageJson: true,
  packageJsonScripts: {},
  devDependencies: {
    tsx: "^4.19.0",
    typescript: "^5.7.0",
  },
  installCommand: null,
  commands(ctx) {
    const pmRun = ctx.vars.PM_RUN;
    const pairs: Array<[string, string]> = [];
    if (ctx.facts.hasPackageJson || ctx.options.includeGates) {
      pairs.push([ctx.vars.INSTALL_CMD, "install dependencies"]);
    }
    const candidates: Array<[string, string]> = [
      ["test", "unit tests"],
      ["lint", "lint"],
      ["typecheck", "type check"],
      ["build", "build"],
    ];
    for (const [script, comment] of candidates) {
      if (script in ctx.facts.nodeScripts) {
        pairs.push([`${pmRun} ${script}`, comment]);
      }
    }
    if (ctx.options.includeGates) {
      pairs.push([`${pmRun} test:docs`, "quick documentation checks"]);
      pairs.push([`${pmRun} doc-sync`, "all documentation gates"]);
    }
    if (pairs.length === 0) {
      return "No package.json or npm script is recorded yet. Add each command here as it appears; agents rely on runnable commands.";
    }
    return commandBlock(pairs);
  },
  conventions(ctx) {
    const rules = [...UNIVERSAL_CONVENTIONS, ...SHARED_SAFETY];
    if (ctx.facts.hasTsconfig) {
      rules.splice(1, 0, ...TYPE_SCRIPT_CONVENTIONS);
    } else {
      rules.splice(1, 0, "**Follow the manifest.** Keep one module system and one lint configuration for the repository.");
    }
    return bullets(rules);
  },
  layout(ctx) {
    const rows = layoutRows(ctx);
    const width = Math.max(...rows.map(([name]) => name.length)) + 2;
    return ["```", ...rows.map(([name, what]) => `${name.padEnd(width)}${what}`), "```"].join("\n");
  },
  verification(ctx) {
    if (!ctx.options.includeGates) {
      return "Before handing off, apply the manual checklist in [docs/testing.md](docs/testing.md): one physical line per paragraph, resolvable relative links, and a current Agent Note for every non-trivial change.";
    }
    return `Run the gate that covers the changed surface rather than the whole matrix: \`${ctx.vars.DOC_QUICK_CMD}\` while editing prose and \`${ctx.vars.DOC_SYNC_CMD}\` before handing off. CI owns the exhaustive matrix.`;
  },
  documentationRule(ctx) {
    const base =
      "Prose follows [docs/AGENTS.md](docs/AGENTS.md): one home per fact, one physical line per paragraph, and complete propositions instead of narration. A behavior change updates the owning document in the same change.";
    return ctx.options.bilingual
      ? `${base} Documentation is bilingual: every English \`.md\` keeps its \`.zh.md\` companion in sync.`
      : base;
  },
  checkTable(ctx) {
    const rows: Array<[string, string]> = [];
    const sourceChecks: string[] = [];
    if (ctx.vars.TYPECHECK_CMD) sourceChecks.push(`\`${ctx.vars.TYPECHECK_CMD}\``);
    if (ctx.vars.TEST_CMD) sourceChecks.push(`\`${ctx.vars.TEST_CMD}\``);
    if (ctx.vars.LINT_CMD) sourceChecks.push(`\`${ctx.vars.LINT_CMD}\``);
    rows.push(["Source code", sourceChecks.length > 0 ? sourceChecks.join(", ") : "the project's own checks"]);
    rows.push(["Documentation (`*.md`)", ctx.options.includeGates ? `\`${ctx.vars.DOC_QUICK_CMD}\`, \`${ctx.vars.DOC_SYNC_CMD}\`` : "manual checklist in [docs/testing.md](../../../docs/testing.md)"]);
    rows.push([
      "Agent Notes (`.agents/notes/`)",
      ctx.options.includeGates
        ? `\`${ctx.vars.NOTE_FORMAT_CMD}\`, \`${ctx.vars.NOTE_CLASS_CMD}\``
        : "manual format review",
    ]);
    return ["| Changed area | Required checks |", "|---|---|", ...rows.map(([a, b]) => `| ${a} | ${b} |`)].join("\n");
  },
  prerequisites() {
    return bullets(["Node.js 18 or newer", "The package manager recorded in the lockfile", "Git 2.26 or newer"]);
  },
  setup(ctx) {
    if (!ctx.options.includeGates) {
      return `Install dependencies from the repository root:\n\n${sh([ctx.vars.INSTALL_CMD])}\n\nThen run the project's own test command once to confirm the checkout.`;
    }
    return `Install dependencies from the repository root:\n\n${sh([ctx.vars.INSTALL_CMD])}\n\nThen run \`${ctx.vars.DOC_SYNC_CMD}\` once to confirm the gates and the toolchain agree.`;
  },
  ciStatus(ctx) {
    return ctx.facts.hasCi
      ? "CI runs the project's checks on every pull request. The workflow under `.github/workflows/` is authoritative; keep it in sync with the commands in [AGENTS.md](../AGENTS.md)."
      : "No CI workflow exists yet. Add one that runs the commands in [AGENTS.md](../AGENTS.md) before contributors depend on agent changes.";
  },
  tiers(ctx) {
    const lines: string[] = [];
    lines.push(
      ctx.vars.TEST_CMD
        ? `- **Unit** (\`${ctx.vars.TEST_CMD}\`): tests stay with the code area they exercise. Prefer edge cases, error paths, event ordering, and a permanent test for every contract regression.`
        : "- **Unit**: no test command is recorded yet. Add one before a change depends on tests for its evidence.",
    );
    lines.push(
      "- **Integration and end-to-end**: exercise the path users and CI actually take — the published command, the real config loader — and mock only external services or nondeterministic inputs.",
    );
    lines.push(
      "- **Coverage**: add a per-file gate only where dead code must not ship. Line coverage proves lines ran, never that the behavior is correct.",
    );
    return lines.join("\n");
  },
  architectureOverview(ctx) {
    return ctx.facts.sourceDirs.length > 0
      ? `${ctx.vars.PROJECT_NAME} is organised around the areas in the module map. Each row names an area and the responsibility it owns; new behavior belongs where its owner already lives.`
      : `No source directories were detected in ${ctx.vars.PROJECT_NAME} yet. Add a row to the module map as each one lands.`;
  },
  moduleMap(ctx) {
    const rows: Array<[string, string]> = [];
    for (const dir of ctx.facts.sourceDirs) {
      if (ctx.options.monorepo && dir === "packages") continue;
      rows.push([`\`${dir}/\``, "TODO(agent-spec-init): describe what this module owns."]);
    }
    if (ctx.options.monorepo) {
      rows.push(["`packages/`", "Workspace packages; each package README is its consumer contract."]);
    }
    if (rows.length === 0) {
      return "No modules recorded yet. Add one row per module with the responsibility it owns.";
    }
    return [
      "| Area | Responsibility |",
      "|---|---|",
      ...rows.map(([area, owns]) => `| ${area} | ${owns} |`),
    ].join("\n");
  },
  dataFlow() {
    return "Describe the primary request and data path here, then keep it in sync with the module map. Link the Agent Note that records a non-obvious ordering.";
  },
  extensionPoints() {
    return "List the extension points new behavior must use, one row each, with the contract it guarantees. A behavior that needs a new extension point starts with an Agent Note.";
  },
};

/** Python profile. */
const pythonProfile: StackProfile = {
  id: "python",
  label: "Python",
  description: "Stdlib-only documentation gates, no package manager required.",
  gateFiles: [{ template: "python/scripts/doc_gates.py", target: "scripts/doc_gates.py" }],
  configFiles: [],
  createsPackageJson: false,
  packageJsonScripts: {},
  devDependencies: {},
  installCommand: null,
  commands(ctx) {
    if (!ctx.options.includeGates) {
      return "No verification command is installed. Run the manual checklist in [docs/testing.md](docs/testing.md) before every change.";
    }
    const python = ctx.vars.PYTHON;
    const pairs: Array<[string, string]> = [
      [`${python} scripts/doc_gates.py doc-quick`, "quick documentation checks"],
      [`${python} scripts/doc_gates.py doc-sync`, "all documentation gates"],
    ];
    if (ctx.facts.hasPytest) {
      pairs.push([`${python} -m pytest`, "test suite"]);
    }
    return commandBlock(pairs);
  },
  conventions() {
    return bullets([...UNIVERSAL_CONVENTIONS, ...SHARED_SAFETY, ...PYTHON_CONVENTIONS]);
  },
  layout(ctx) {
    const rows = layoutRows(ctx);
    const width = Math.max(...rows.map(([name]) => name.length)) + 2;
    return ["```", ...rows.map(([name, what]) => `${name.padEnd(width)}${what}`), "```"].join("\n");
  },
  verification(ctx) {
    if (!ctx.options.includeGates) {
      return "Before handing off, apply the manual checklist in [docs/testing.md](docs/testing.md): one physical line per paragraph, resolvable relative links, and a current Agent Note for every non-trivial change.";
    }
    return `Run the gate that covers the changed surface rather than the whole matrix: \`${ctx.vars.DOC_QUICK_CMD}\` while editing prose and \`${ctx.vars.DOC_SYNC_CMD}\` before handing off. CI owns the exhaustive matrix.`;
  },
  documentationRule(ctx) {
    const base =
      "Prose follows [docs/AGENTS.md](docs/AGENTS.md): one home per fact, one physical line per paragraph, and complete propositions instead of narration. A behavior change updates the owning document in the same change.";
    return ctx.options.bilingual
      ? `${base} Documentation is bilingual: every English \`.md\` keeps its \`.zh.md\` companion in sync.`
      : base;
  },
  checkTable(ctx) {
    const rows: Array<[string, string]> = [];
    rows.push([
      "Source code",
      ctx.facts.hasPytest ? `\`${ctx.vars.PYTHON} -m pytest\`` : "the project's own checks",
    ]);
    rows.push([
      "Documentation (`*.md`)",
      ctx.options.includeGates
        ? `\`${ctx.vars.DOC_QUICK_CMD}\`, \`${ctx.vars.DOC_SYNC_CMD}\``
        : "manual checklist in [docs/testing.md](../../../docs/testing.md)",
    ]);
    rows.push([
      "Agent Notes (`.agents/notes/`)",
      ctx.options.includeGates ? `\`${ctx.vars.NOTE_FORMAT_CMD}\`` : "manual format review",
    ]);
    return ["| Changed area | Required checks |", "|---|---|", ...rows.map(([a, b]) => `| ${a} | ${b} |`)].join("\n");
  },
  prerequisites() {
    return bullets(["Python 3.10 or newer", "Git 2.26 or newer"]);
  },
  setup(ctx) {
    const python = ctx.vars.PYTHON;
    const lines = [
      `Create and activate a virtual environment:\n\n${sh([`${python} -m venv .venv`])}`,
      "Install dependencies with the project's own command, for example `pip install -e .` or `pip install -r requirements.txt`.",
    ];
    if (ctx.options.includeGates) {
      lines.push(`Run \`${ctx.vars.DOC_SYNC_CMD}\` once to confirm the gates pass on a clean checkout.`);
    }
    return lines.join("\n\n");
  },
  ciStatus(ctx) {
    return ctx.facts.hasCi
      ? "CI runs the project's checks on every pull request. The workflow under `.github/workflows/` is authoritative; keep it in sync with the commands in [AGENTS.md](../AGENTS.md)."
      : "No CI workflow exists yet. Add one that runs the commands in [AGENTS.md](../AGENTS.md) before contributors depend on agent changes.";
  },
  tiers(ctx) {
    const lines: string[] = [];
    lines.push(
      ctx.facts.hasPytest
        ? `- **Unit** (\`${ctx.vars.PYTHON} -m pytest\`): tests stay beside the module they exercise. Prefer edge cases, error paths, and a permanent test for every contract regression.`
        : "- **Unit**: no test runner is recorded yet. Add one before a change depends on tests for its evidence.",
    );
    lines.push(
      "- **Integration and end-to-end**: exercise the real entry point — the installed command, the real configuration — and mock only external services or nondeterministic inputs.",
    );
    lines.push(
      "- **Coverage**: add a per-file gate only where dead code must not ship. Line coverage proves lines ran, never that the behavior is correct.",
    );
    return lines.join("\n");
  },
  architectureOverview(ctx) {
    return ctx.facts.sourceDirs.length > 0
      ? `${ctx.vars.PROJECT_NAME} is organised around the areas in the module map. Each row names an area and the responsibility it owns; new behavior belongs where its owner already lives.`
      : `No source directories were detected in ${ctx.vars.PROJECT_NAME} yet. Add a row to the module map as each one lands.`;
  },
  moduleMap(ctx) {
    const rows: Array<[string, string]> = [];
    for (const dir of ctx.facts.sourceDirs) {
      if (ctx.options.monorepo && dir === "packages") continue;
      rows.push([`\`${dir}/\``, "TODO(agent-spec-init): describe what this module owns."]);
    }
    if (ctx.options.monorepo) {
      rows.push(["`packages/`", "Workspace packages; each package README is its consumer contract."]);
    }
    if (rows.length === 0) {
      return "No modules recorded yet. Add one row per module with the responsibility it owns.";
    }
    return [
      "| Area | Responsibility |",
      "|---|---|",
      ...rows.map(([area, owns]) => `| ${area} | ${owns} |`),
    ].join("\n");
  },
  dataFlow() {
    return "Describe the primary request and data path here, then keep it in sync with the module map. Link the Agent Note that records a non-obvious ordering.";
  },
  extensionPoints() {
    return "List the extension points new behavior must use, one row each, with the contract it guarantees. A behavior that needs a new extension point starts with an Agent Note.";
  },
};

/** Docs-only profile for stacks without a supported gate runtime. */
const genericProfile: StackProfile = {
  id: "generic",
  label: "Generic / docs only",
  description: "Specification core without gate scripts; verification is a manual checklist.",
  gateFiles: [],
  configFiles: [],
  createsPackageJson: false,
  packageJsonScripts: {},
  devDependencies: {},
  installCommand: null,
  commands() {
    return "No build, test, or verification command is recorded yet. Add each command here as it appears; agents rely on runnable commands.";
  },
  conventions() {
    return bullets([...UNIVERSAL_CONVENTIONS, ...SHARED_SAFETY]);
  },
  layout(ctx) {
    const rows = layoutRows(ctx);
    const width = Math.max(...rows.map(([name]) => name.length)) + 2;
    return ["```", ...rows.map(([name, what]) => `${name.padEnd(width)}${what}`), "```"].join("\n");
  },
  verification() {
    return "Before handing off, apply the manual checklist in [docs/testing.md](docs/testing.md): one physical line per paragraph, resolvable relative links, and a current Agent Note for every non-trivial change.";
  },
  documentationRule(ctx) {
    const base =
      "Prose follows [docs/AGENTS.md](docs/AGENTS.md): one home per fact, one physical line per paragraph, and complete propositions instead of narration. A behavior change updates the owning document in the same change.";
    return ctx.options.bilingual
      ? `${base} Documentation is bilingual: every English \`.md\` keeps its \`.zh.md\` companion in sync.`
      : base;
  },
  checkTable() {
    return [
      "| Changed area | Required checks |",
      "|---|---|",
      "| Any change | Manual checklist in [docs/testing.md](../../../docs/testing.md): links, wrap, budgets |",
      "| Agent Notes (`.agents/notes/`) | Format review against [the note format](../../../.agents/notes/README.md#the-file-format) |",
    ].join("\n");
  },
  prerequisites() {
    return bullets([
      "The runtime this project requires, pinned to a version",
      "Git 2.26 or newer",
    ]);
  },
  setup() {
    return "Record the setup commands here once they are known, and keep them runnable from a clean checkout. A command in this guide is verified or labelled unverified.";
  },
  ciStatus(ctx) {
    return ctx.facts.hasCi
      ? "CI runs the project's checks on every pull request. The workflow under `.github/workflows/` is authoritative; keep it in sync with the commands in [AGENTS.md](../AGENTS.md)."
      : "No CI workflow exists yet. Add one that runs the commands in [AGENTS.md](../AGENTS.md) before contributors depend on agent changes.";
  },
  tiers() {
    return [
      "- **Unit and integration**: record the project's test command in [AGENTS.md](../AGENTS.md) when one exists; until then every change needs a manual reproduction step in its Agent Note.",
      "- **Coverage and snapshots**: add them only when a stable output surface exists; a snapshot without an owner becomes noise.",
    ].join("\n");
  },
  architectureOverview(ctx) {
    return ctx.facts.sourceDirs.length > 0
      ? `${ctx.vars.PROJECT_NAME} is organised around the areas in the module map. Each row names an area and the responsibility it owns; new behavior belongs where its owner already lives.`
      : `No source directories were detected in ${ctx.vars.PROJECT_NAME} yet. Add a row to the module map as each one lands.`;
  },
  moduleMap(ctx) {
    const rows: Array<[string, string]> = [];
    for (const dir of ctx.facts.sourceDirs) {
      if (ctx.options.monorepo && dir === "packages") continue;
      rows.push([`\`${dir}/\``, "TODO(agent-spec-init): describe what this module owns."]);
    }
    if (ctx.options.monorepo) {
      rows.push(["`packages/`", "Workspace packages; each package README is its consumer contract."]);
    }
    if (rows.length === 0) {
      return "No modules recorded yet. Add one row per module with the responsibility it owns.";
    }
    return [
      "| Area | Responsibility |",
      "|---|---|",
      ...rows.map(([area, owns]) => `| ${area} | ${owns} |`),
    ].join("\n");
  },
  dataFlow() {
    return "Describe the primary request and data path here, then keep it in sync with the module map. Link the Agent Note that records a non-obvious ordering.";
  },
  extensionPoints() {
    return "List the extension points new behavior must use, one row each, with the contract it guarantees. A behavior that needs a new extension point starts with an Agent Note.";
  },
};

const PROFILES: Record<TemplateId, StackProfile> = {
  node: nodeProfile,
  python: pythonProfile,
  generic: genericProfile,
};

/**
 * Look up a stack profile.
 *
 * @param id Resolved template identifier.
 * @returns The matching profile.
 */
export function getProfile(id: TemplateId): StackProfile {
  return PROFILES[id];
}

/** Every profile, in the order the interactive picker lists them. */
export const PROFILE_LIST: StackProfile[] = [
  nodeProfile,
  pythonProfile,
  genericProfile,
];

/** Command strings a profile needs, derived from facts and the selected template. */
export function buildVars(
  facts: ProjectFacts,
  options: InitOptions,
): TemplateVars {
  const pm = options.packageManager;
  const pmRun = pm === "npm" ? "npm run" : pm === "pnpm" ? "pnpm run" : "yarn";
  const python = facts.pythonInterpreter;
  const gates = options.includeGates;

  const nodeScript = (name: string): string =>
    facts.nodeScripts[name] ? `${pmRun} ${name}` : "";

  return {
    PROJECT_NAME: options.projectName,
    PROJECT_LABEL: options.projectName,
    DATE: new Date().toISOString().slice(0, 10),
    YEAR: String(new Date().getFullYear()),
    TEMPLATE: options.template,
    PM: pm,
    PM_RUN: pmRun,
    INSTALL_CMD: `${pm} install`,
    PYTHON: python,
    TEST_CMD: options.template === "node" ? nodeScript("test") : "",
    LINT_CMD: options.template === "node" ? nodeScript("lint") : "",
    TYPECHECK_CMD: options.template === "node" ? nodeScript("typecheck") : "",
    BUILD_CMD: options.template === "node" ? nodeScript("build") : "",
    DOC_SYNC_CMD: gates
      ? options.template === "node"
        ? `${pmRun} doc-sync`
        : `${python} scripts/doc_gates.py doc-sync`
      : "",
    DOC_QUICK_CMD: gates
      ? options.template === "node"
        ? `${pmRun} test:docs`
        : `${python} scripts/doc_gates.py doc-quick`
      : "",
    NOTE_FORMAT_CMD: gates
      ? options.template === "node"
        ? `${pmRun} verify-agent-note-format`
        : `${python} scripts/doc_gates.py verify-agent-note-format`
      : "",
    NOTE_CLASS_CMD: gates
      ? options.template === "node"
        ? `${pmRun} verify-agent-note-classification`
        : `${python} scripts/doc_gates.py verify-agent-note-classification`
      : "",
  };
}
