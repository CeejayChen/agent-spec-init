/**
 * Public API for agent-spec-init.
 *
 * The CLI is one consumer; these exports let another tool plan, preview, or
 * apply the same specification system without spawning a process.
 */

import { applyPlan, previewPlan } from "./apply.js";
import { detectProject, emptyFacts, pathExists } from "./detect.js";
import { buildPlan } from "./plan.js";
import type { InitOptions, ScaffoldReport } from "./types.js";

export { applyPlan, previewPlan } from "./apply.js";
export { detectProject, detectTemplate, emptyFacts } from "./detect.js";
export { resolveOptions, type ResolvedRun } from "./options.js";
export { buildPlan, buildTemplateVars } from "./plan.js";
export { buildVars, getProfile, PROFILE_LIST, type StackProfile } from "./profiles.js";
export { normalizeText, render, renderTemplate, templateRoot } from "./render.js";
export { NEEDS_ATTENTION_MARKER, nextSteps, printReport, toJsonReport } from "./report.js";
export * from "./types.js";

/**
 * Plan and apply a scaffold run without post-actions.
 *
 * @param options Resolved options.
 * @returns The plan, its outcome, and the facts used to build it.
 */
export function scaffold(options: InitOptions): ScaffoldReport {
  const facts = pathExists(options.targetDir)
    ? detectProject(options.targetDir)
    : emptyFacts(options.targetDir);
  const plan = buildPlan(facts, options);
  const applied = options.dryRun
    ? previewPlan(plan, options)
    : applyPlan(plan, options);

  return {
    facts,
    options,
    plan,
    applied,
    postActions: [],
    postActionErrors: [],
  };
}
