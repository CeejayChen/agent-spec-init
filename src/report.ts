/**
 * Turns a completed (or previewed) run into the human summary or the JSON
 * payload agents consume.
 */

import type {
  FileAction,
  ScaffoldReport,
  TemplateId,
} from "./types.js";

/** Marker used by generated prose that needs project-specific content. */
export const NEEDS_ATTENTION_MARKER = "TODO(agent-spec-init)";

/** One line describing the run target. */
function targetLine(report: ScaffoldReport): string {
  const { options, facts } = report;
  const parts = [`Profile: ${options.template}`, `Target: ${options.targetDir}`];
  if (options.template === "node") {
    parts.push(`Package manager: ${options.packageManager} (${facts.packageManagerSource})`);
  }
  parts.push(`Gates: ${options.includeGates ? "on" : "off"}`);
  parts.push(`Skills: ${options.includeSkills ? "on" : "off"}`);
  if (options.bilingual) parts.push("Docs: bilingual");
  return parts.join(" · ");
}

/** Files that still contain a project-specific marker. */
export function needsAttention(report: ScaffoldReport): string[] {
  return report.plan.files
    .filter((file) => file.content.includes(NEEDS_ATTENTION_MARKER))
    .map((file) => file.path);
}

/** Commands the report recommends next, derived from the resolved options. */
export function nextSteps(report: ScaffoldReport): string[] {
  const { options, facts } = report;
  const steps: string[] = [];

  if (options.template === "node" && options.includeGates) {
    const packageManager = options.packageManager;
    const pmRun =
      packageManager === "npm" ? "npm run" : packageManager === "pnpm" ? "pnpm run" : "yarn";
    if (!options.install) {
      steps.push(`Install the gate dependencies: \`${packageManager} install\``);
    }
    steps.push(`Check the generated documents: \`${pmRun} test:docs\``);
    steps.push(`Run the full gate set before handing off: \`${pmRun} doc-sync\``);
  } else if (options.template === "python" && options.includeGates) {
    steps.push(`Check the generated documents: \`${facts.pythonInterpreter} scripts/doc_gates.py doc-quick\``);
    steps.push(`Run the full gate set before handing off: \`${facts.pythonInterpreter} scripts/doc_gates.py doc-sync\``);
  } else {
    steps.push("Review [docs/testing.md](docs/testing.md) and apply the manual checklist before handing off");
  }

  const todoFiles = needsAttention(report);
  if (todoFiles.length > 0) {
    steps.push(
      `Replace ${NEEDS_ATTENTION_MARKER} with the real owner in: ${todoFiles.join(", ")}`,
    );
  }

  steps.push(
    "Write the first Agent Note under .agents/notes/implemented/process/ recording why this specification layer exists",
  );

  if (report.applied.files.some((file) => file.action === "kept")) {
    steps.push(
      "Review the kept files and merge the rules you accept; `--force` replaces them wholesale",
    );
  }

  return steps;
}

/** Group file outcomes by action. */
function groupByAction(
  report: ScaffoldReport,
): Record<FileAction, string[]> {
  const groups: Record<FileAction, string[]> = {
    created: [],
    overwritten: [],
    unchanged: [],
    kept: [],
  };
  for (const file of report.applied.files) {
    groups[file.action].push(file.path);
  }
  return groups;
}

/**
 * Print the human summary for a run.
 *
 * @param report Completed or previewed run.
 * @param version Tool version shown in the header.
 */
export function printReport(report: ScaffoldReport, version: string): void {
  const groups = groupByAction(report);
  const dryRun = report.options.dryRun;

  console.log("");
  console.log(`agent-spec-init ${version}`);
  console.log(targetLine(report));
  if (dryRun) console.log("Dry run — nothing was written.");

  const headings: Array<[FileAction, string, string]> = [
    ["created", "Created", "would create"],
    ["overwritten", "Overwritten", "would overwrite"],
    ["kept", "Kept (exists, differs — use --force to replace)", "would keep"],
    ["unchanged", "Unchanged", "unchanged"],
  ];

  for (const [action, label, previewLabel] of headings) {
    const files = groups[action];
    if (files.length === 0) continue;
    const heading = dryRun && action !== "unchanged" ? previewLabel : label;
    console.log("");
    console.log(`${heading} ${files.length} file(s):`);
    for (const file of files) console.log(`  ${file}`);
  }

  for (const update of report.applied.jsonUpdates) {
    if (!update.changed) continue;
    const parts: string[] = [];
    if (update.addedScripts.length > 0) {
      parts.push(`${update.addedScripts.length} script(s)`);
    }
    if (update.addedDevDependencies.length > 0) {
      parts.push(`${update.addedDevDependencies.length} devDependency(ies)`);
    }
    console.log("");
    console.log(`${update.path}: ${dryRun ? "would add" : "added"} ${parts.join(", ")}`);
    if (update.keptKeys.length > 0) {
      console.log(`  kept existing: ${update.keptKeys.join(", ")}`);
    }
  }

  if (report.postActions.length > 0) {
    console.log("");
    console.log(`Ran: ${report.postActions.join(", ")}`);
  }

  const errors = [...report.applied.errors, ...report.postActionErrors];
  if (errors.length > 0) {
    console.log("");
    console.error(`Errors (${errors.length}):`);
    for (const error of errors) console.error(`  ${error}`);
  }

  if (report.facts.instructionFiles.length > 0) {
    console.log("");
    console.log(
      `Existing instruction files detected: ${report.facts.instructionFiles.join(", ")}. Merge their rules into AGENTS.md by hand; this tool never merges prose automatically.`,
    );
  }

  console.log("");
  console.log("Next steps:");
  nextSteps(report).forEach((step, index) => {
    console.log(`  ${index + 1}. ${step}`);
  });
  console.log("");
}

/** Shape printed by `--json`. */
export interface JsonReport {
  tool: "agent-spec-init";
  version: string;
  dryRun: boolean;
  target: string;
  profile: TemplateId;
  packageManager: string;
  bilingual: boolean;
  gates: boolean;
  skills: boolean;
  files: {
    created: string[];
    overwritten: string[];
    kept: string[];
    unchanged: string[];
  };
  manifestUpdates: Array<{
    path: string;
    changed: boolean;
    addedScripts: string[];
    addedDevDependencies: string[];
    keptKeys: string[];
  }>;
  postActions: string[];
  errors: string[];
  needsAttention: string[];
  nextSteps: string[];
}

/**
 * Build the machine-readable run report.
 *
 * @param report Completed or previewed run.
 * @param version Tool version.
 * @returns JSON-serializable summary.
 */
export function toJsonReport(
  report: ScaffoldReport,
  version: string,
): JsonReport {
  const groups = groupByAction(report);
  return {
    tool: "agent-spec-init",
    version,
    dryRun: report.options.dryRun,
    target: report.options.targetDir,
    profile: report.options.template,
    packageManager: report.options.packageManager,
    bilingual: report.options.bilingual,
    gates: report.options.includeGates,
    skills: report.options.includeSkills,
    files: groups,
    manifestUpdates: report.applied.jsonUpdates,
    postActions: report.postActions,
    errors: [...report.applied.errors, ...report.postActionErrors],
    needsAttention: needsAttention(report),
    nextSteps: nextSteps(report),
  };
}
