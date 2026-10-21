/**
 * Turns raw CLI flags into validated options, filling gaps from detection and
 * prompting only when the session is interactive and `--yes` was not passed.
 */

import * as clack from "@clack/prompts";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { detectProject, emptyFacts, pathExists } from "./detect.js";
import { PROFILE_LIST } from "./profiles.js";
import {
  UsageError,
  type CliFlags,
  type InitOptions,
  type PackageManager,
  type ProjectFacts,
  type TemplateId,
} from "./types.js";

const TEMPLATE_IDS: TemplateId[] = ["node", "python", "generic"];
const PACKAGE_MANAGERS: PackageManager[] = ["npm", "pnpm", "yarn"];

/** Resolved options plus the facts they were derived from. */
export interface ResolvedRun {
  facts: ProjectFacts;
  options: InitOptions;
}

/** Parse the `--template` value. */
function parseTemplate(value: string | undefined): TemplateId | "auto" {
  if (value === undefined || value === "auto") return "auto";
  if ((TEMPLATE_IDS as string[]).includes(value)) return value as TemplateId;
  throw new UsageError(
    `Unsupported --template "${value}". Use one of: auto, ${TEMPLATE_IDS.join(", ")}.`,
  );
}

/** Parse the `--pm` value. */
function parsePackageManager(value: string | undefined): PackageManager | null {
  if (value === undefined) return null;
  if ((PACKAGE_MANAGERS as string[]).includes(value)) {
    return value as PackageManager;
  }
  throw new UsageError(
    `Unsupported --pm "${value}". Use one of: ${PACKAGE_MANAGERS.join(", ")}.`,
  );
}

/** Parse the `--lang` value. */
function parseLanguage(value: string | undefined): boolean | null {
  if (value === undefined) return null;
  if (value === "bilingual") return true;
  if (value === "en") return false;
  throw new UsageError(`Unsupported --lang "${value}". Use "en" or "bilingual".`);
}

/** Stop on a cancelled prompt. */
function cancelled(): void {
  clack.cancel("Cancelled — nothing was written.");
}

/**
 * Resolve flags, detection, and prompts into a run.
 *
 * @param flags Raw CLI flags.
 * @param cwd Directory relative targets resolve against.
 * @returns Facts and options, or null when the user cancelled a prompt.
 * @throws UsageError when a flag value is unsupported.
 */
export async function resolveOptions(
  flags: CliFlags,
  cwd: string,
): Promise<ResolvedRun | null> {
  if (flags.global && !flags.skillOnly) {
    throw new UsageError("--global requires --skill-only.");
  }

  const requestedTemplate = parseTemplate(flags.template);
  const requestedPackageManager = parsePackageManager(flags.pm);
  const requestedBilingual = parseLanguage(flags.lang);

  const targetDir = flags.skillOnly && flags.global
    ? homedir()
    : flags.directory
      ? resolve(cwd, flags.directory)
      : cwd;

  const facts = pathExists(targetDir) ? detectProject(targetDir) : emptyFacts(targetDir);
  const template = requestedTemplate === "auto" ? facts.template : requestedTemplate;

  const base: InitOptions = {
    targetDir,
    projectName: flags.name ?? facts.projectName,
    template,
    packageManager: requestedPackageManager ?? facts.packageManager,
    bilingual: requestedBilingual ?? facts.bilingualDocs,
    includeGates: template === "generic" ? false : flags.gates !== false,
    includeSkills: flags.skills !== false,
    monorepo: flags.monorepo === true ? true : facts.monorepo,
    force: flags.force === true,
    dryRun: flags.dryRun === true,
    install: flags.install === true,
    git: flags.git === true,
    json: flags.json === true,
    skillOnly: flags.skillOnly === true,
    global: flags.global === true,
    yes: flags.yes === true,
  };

  if (base.skillOnly) {
    return { facts, options: { ...base, includeGates: false } };
  }

  if (!base.yes) {
    const prompted = await promptForOptions(base, facts);
    if (prompted === null) return null;
    return { facts, options: prompted };
  }

  return { facts, options: base };
}

/** Ask the user only for choices detection cannot settle confidently. */
async function promptForOptions(
  base: InitOptions,
  facts: ProjectFacts,
): Promise<InitOptions | null> {
  clack.intro("agent-spec-init — AI agent development specification scaffold");

  console.log("");
  console.log(`Target: ${base.targetDir}`);
  if (pathExists(base.targetDir) && facts.instructionFiles.length > 0) {
    clack.log.warn(
      `Existing instruction files: ${facts.instructionFiles.join(", ")}. Their content is kept; merge the new rules by hand.`,
    );
  }

  const name = await clack.text({
    message: "Project name",
    placeholder: facts.projectName,
    defaultValue: facts.projectName,
  });
  if (clack.isCancel(name)) {
    cancelled();
    return null;
  }

  const template = await clack.select({
    message: "Stack profile",
    options: PROFILE_LIST.map((profile) => ({
      value: profile.id,
      label: profile.label,
      hint: profile.description,
    })),
    initialValue: base.template,
  });
  if (clack.isCancel(template)) {
    cancelled();
    return null;
  }

  const lang = await clack.select({
    message: "Documentation language",
    options: [
      { value: "en", label: "English only" },
      { value: "bilingual", label: "Bilingual (English + Chinese companion files)" },
    ],
    initialValue: base.bilingual ? "bilingual" : "en",
  });
  if (clack.isCancel(lang)) {
    cancelled();
    return null;
  }

  const draft: InitOptions = {
    ...base,
    projectName: name.trim() === "" ? facts.projectName : name.trim(),
    template: template as TemplateId,
    bilingual: lang === "bilingual",
  };
  draft.includeGates = draft.template === "generic" ? false : base.includeGates;

  console.log("");
  console.log(
    `Profile ${draft.template} · ${draft.includeGates ? "gates on" : "gates off"} · ${
      draft.includeSkills ? "skills on" : "skills off"
    } · ${draft.bilingual ? "bilingual" : "English"}`,
  );

  const proceed = await clack.confirm({
    message: "Write these files?",
    initialValue: true,
  });
  if (clack.isCancel(proceed) || !proceed) {
    cancelled();
    return null;
  }

  return draft;
}
