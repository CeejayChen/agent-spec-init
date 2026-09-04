/**
 * Interactive prompts for agent-spec-init CLI.
 * Uses @clack/prompts for a polished terminal experience.
 */

import * as clack from "@clack/prompts";
import { execSync } from "node:child_process";

export interface InitOptions {
  projectName: string;
  bilingual: boolean;
  packageManager: "npm" | "pnpm" | "yarn";
  includeGates: boolean;
  includeSkills: boolean;
  force: boolean;
}

/** Try to detect the package manager from lockfiles. */
function detectPackageManager(): "npm" | "pnpm" | "yarn" | null {
  try {
    execSync("pnpm --version", { stdio: "ignore" });
    return "pnpm";
  } catch {
    // not pnpm
  }
  try {
    execSync("yarn --version", { stdio: "ignore" });
    return "yarn";
  } catch {
    // not yarn
  }
  return "npm";
}

/** Extract defaults from CLI flags. */
export interface CliFlags {
  name?: string;
  lang?: string;
  pm?: string;
  skipInstall?: boolean;
  noGates?: boolean;
  force?: boolean;
  yes?: boolean;
}

export async function gatherOptions(flags: CliFlags): Promise<InitOptions> {
  clack.intro("agent-spec-init — AI Agent Development Specification Scaffolder");

  // Project name
  let projectName = flags.name;
  if (!projectName && !flags.yes) {
    projectName = await clack.text({
      message: "Project name",
      placeholder: "my-agent-project",
      defaultValue: "my-agent-project",
    }) as string;
    if (clack.isCancel(projectName)) {
      clack.cancel("Operation cancelled.");
      process.exit(0);
    }
  }
  projectName = projectName || "my-agent-project";

  // Language
  let bilingual = false;
  if (flags.lang) {
    bilingual = flags.lang === "bilingual";
  } else if (!flags.yes) {
    const lang = await clack.select({
      message: "Language support",
      options: [
        { label: "English only", value: "en" },
        { label: "Bilingual (English + Chinese)", value: "bilingual" },
      ],
      initialValue: "en",
    });
    if (clack.isCancel(lang)) {
      clack.cancel("Operation cancelled.");
      process.exit(0);
    }
    bilingual = lang === "bilingual";
  }

  // Package manager
  let packageManager: "npm" | "pnpm" | "yarn" = "npm";
  if (flags.pm && ["npm", "pnpm", "yarn"].includes(flags.pm)) {
    packageManager = flags.pm as "npm" | "pnpm" | "yarn";
  } else if (!flags.yes) {
    const detected = detectPackageManager();
    const pm = await clack.select({
      message: "Package manager",
      options: [
        { label: "pnpm", value: "pnpm" },
        { label: "npm", value: "npm" },
        { label: "yarn", value: "yarn" },
      ],
      initialValue: detected ?? "pnpm",
    });
    if (clack.isCancel(pm)) {
      clack.cancel("Operation cancelled.");
      process.exit(0);
    }
    packageManager = pm as "npm" | "pnpm" | "yarn";
  }

  // Include gates
  let includeGates = !flags.noGates;
  if (!flags.noGates && !flags.yes) {
    const gates = await clack.confirm({
      message: "Include verification gate scripts?",
      initialValue: true,
    });
    if (clack.isCancel(gates)) {
      clack.cancel("Operation cancelled.");
      process.exit(0);
    }
    includeGates = gates;
  }

  // Include skills
  let includeSkills = true;
  if (!flags.yes) {
    const skills = await clack.confirm({
      message: "Include starter skills (code-review, prose-standard, pre-push-checks)?",
      initialValue: true,
    });
    if (clack.isCancel(skills)) {
      clack.cancel("Operation cancelled.");
      process.exit(0);
    }
    includeSkills = skills;
  }

  // Confirmation
  if (!flags.yes) {
    clack.log.info(`
Configuration:
  Project:     ${projectName}
  Language:    ${bilingual ? "bilingual (en + zh)" : "English only"}
  Package mgr: ${packageManager}
  Gates:       ${includeGates ? "yes" : "no"}
  Skills:      ${includeSkills ? "yes" : "no"}
  Force:       ${flags.force ? "yes" : "no"}
`);

    const confirm = await clack.confirm({
      message: "Proceed with scaffolding?",
      initialValue: true,
    });
    if (clack.isCancel(confirm) || !confirm) {
      clack.cancel("Operation cancelled.");
      process.exit(0);
    }
  }

  return {
    projectName,
    bilingual,
    packageManager,
    includeGates,
    includeSkills,
    force: flags.force ?? false,
  };
}
