/**
 * Core scaffolding engine for agent-spec-init.
 * Renders templates and writes them to the target directory.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { InitOptions } from "./prompts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, "templates");

/** Template variable map. */
interface TemplateVars {
  PROJECT_NAME: string;
  PROJECT_NAME_UPPER: string;
  DATE: string;
  YEAR: string;
  PACKAGE_MANAGER: string;
  PM: string;
  PM_RUN: string;
  BILINGUAL: string;
  BILINGUAL_HEADER: string;
}

function buildVars(options: InitOptions): TemplateVars {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const year = String(now.getFullYear());
  const pm = options.packageManager;
  const pmRun = pm === "npm" ? "npm run" : pm === "yarn" ? "yarn" : "pnpm run";

  return {
    PROJECT_NAME: options.projectName,
    PROJECT_NAME_UPPER: options.projectName.toUpperCase().replace(/-/g, " "),
    DATE: date,
    YEAR: year,
    PACKAGE_MANAGER: pm,
    PM: pm,
    PM_RUN: pmRun,
    BILINGUAL: String(options.bilingual),
    BILINGUAL_HEADER: options.bilingual
      ? "English | [中文]<!-- Add .zh.md link -->"
      : "",
  };
}

/** Render a template string by replacing {{VAR}} placeholders. */
export function render(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return key in vars ? vars[key as keyof TemplateVars] : `{{${key}}}`;
  });
}

/** Read a template file from the templates directory. */
function readTemplate(relativePath: string): string {
  const fullPath = join(TEMPLATES_DIR, relativePath);
  return readFileSync(fullPath, "utf-8");
}

/** Ensure a directory exists (recursive). */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Write a file, creating parent directories as needed. */
function writeFile(filePath: string, content: string, force: boolean): boolean {
  if (existsSync(filePath) && !force) {
    return false; // skip existing
  }
  ensureDir(dirname(filePath));
  writeFileSync(filePath, content, "utf-8");
  return true;
}

/** Result of the scaffolding operation. */
export interface ScaffoldResult {
  created: string[];
  skipped: string[];
  errors: string[];
}

/** Agent Note classification classes. */
const NOTE_CLASSES = [
  "architecture",
  "process",
  "testing",
  "feature",
  "bug-fix",
  "simplification",
];

/** Lifecycle folders. */
const LIFECYCLES = ["proposed", "implemented", "rejected"];

/**
 * Run the scaffolding process.
 */
export function scaffold(targetDir: string, options: InitOptions): ScaffoldResult {
  const vars = buildVars(options);
  const result: ScaffoldResult = { created: [], skipped: [], errors: [] };

  function write(relPath: string, templatePath: string, extraVars?: Record<string, string>): void {
    try {
      let content = readTemplate(templatePath);
      const allVars = extraVars
        ? { ...vars, ...extraVars } as TemplateVars
        : vars;
      content = render(content, allVars);
      const fullPath = join(targetDir, relPath);
      if (writeFile(fullPath, content, options.force)) {
        result.created.push(relPath);
      } else {
        result.skipped.push(relPath);
      }
    } catch (err) {
      result.errors.push(`${relPath}: ${err}`);
    }
  }

  function writeRaw(relPath: string, content: string): void {
    const fullPath = join(targetDir, relPath);
    if (writeFile(fullPath, content, options.force)) {
      result.created.push(relPath);
    } else {
      result.skipped.push(relPath);
    }
  }

  // === Root AGENTS.md ===
  write("AGENTS.md", "agents-md/root.md");

  // === docs/ ===
  write("docs/AGENTS.md", "agents-md/docs.md");
  write("docs/architecture.md", "docs/architecture.md");
  write("docs/development.md", "docs/development.md");
  write("docs/defensive-patterns.md", "docs/defensive-patterns.md");
  write("docs/testing.md", "docs/testing.md");

  // docs subdirectories (referenced by docs/AGENTS.md tier table)
  ensureDir(join(targetDir, "docs", "postmortem"));
  ensureDir(join(targetDir, "docs", "cookbook"));
  writeRaw("docs/postmortem/README.md", `# Postmortems\n\nIncident stories live here. Each postmortem records the incident sequence, evidence, causal chain, impact, and prevention.\n`);
  writeRaw("docs/cookbook/README.md", `# Cookbook\n\nStep-by-step how-tos with numbered verify steps. Each guide links to the owning Agent Note for design rationale.\n`);

  // === packages/ ===
  write("packages/AGENTS.md", "agents-md/packages.md");
  write("packages/README.md", "docs/development.md", {
    PROJECT_NAME_UPPER: "PACKAGES",
  });

  // === .agents/notes/ ===
  write(".agents/notes/README.md", "notes/README.md");
  write(".agents/notes/AGENTS.md", "agents-md/notes.md");
  write(".agents/notes/archived/AGENTS.md", "notes/archived-agents.md");

  // Create lifecycle/class directory structure
  for (const lifecycle of LIFECYCLES) {
    for (const cls of NOTE_CLASSES) {
      const dir = join(targetDir, ".agents", "notes", lifecycle, cls);
      ensureDir(dir);
      // Write a .gitkeep so the empty dirs are tracked
      const gitkeep = join(dir, ".gitkeep");
      if (!existsSync(gitkeep)) {
        writeRaw(`.agents/notes/${lifecycle}/${cls}/.gitkeep`, "");
      }
    }
  }
  // archived class dirs
  for (const cls of NOTE_CLASSES) {
    const dir = join(targetDir, ".agents", "notes", "archived", cls);
    ensureDir(dir);
    const gitkeep = join(dir, ".gitkeep");
    if (!existsSync(gitkeep)) {
      writeRaw(`.agents/notes/archived/${cls}/.gitkeep`, "");
    }
  }

  // === .agents/skills/ ===
  if (options.includeSkills) {
    write(".agents/skills/code-review/SKILL.md", "skills/code-review.md");
    write(".agents/skills/prose-standard/SKILL.md", "skills/prose-standard.md");
    write(".agents/skills/pre-push-checks/SKILL.md", "skills/pre-push-checks.md");
  }

  // === scripts/ ===
  if (options.includeGates) {
    write("scripts/agent-note-tree.ts", "scripts/agent-note-tree.ts");
    write("scripts/repo-files.ts", "scripts/repo-files.ts");
    write("scripts/verify-agent-note-format.ts", "scripts/verify-agent-note-format.ts");
    write("scripts/verify-agent-note-classification.ts", "scripts/verify-agent-note-classification.ts");
    write("scripts/verify-md-links.ts", "scripts/verify-md-links.ts");
    write("scripts/verify-md-wrap.ts", "scripts/verify-md-wrap.ts");
    write("scripts/verify-doc-budgets.ts", "scripts/verify-doc-budgets.ts");
    write("scripts/verify-export-jsdoc.ts", "scripts/verify-export-jsdoc.ts");
    write("scripts/run-gates.ts", "scripts/run-gates.ts");
    write("scripts/doc-budgets.manifest.json", "config/doc-budgets.manifest.json");
    write("scripts/tsconfig.scripts.json", "config/tsconfig.scripts.json");
  }

  // === package.json scripts (append if exists, create minimal if not) ===
  updatePackageJson(targetDir, vars, options);

  return result;
}

/**
 * Update or create package.json with the verify scripts.
 */
function updatePackageJson(targetDir: string, vars: TemplateVars, options: InitOptions): void {
  const pkgPath = join(targetDir, "package.json");
  let pkg: Record<string, unknown>;

  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    } catch {
      pkg = {};
    }
  } else {
    pkg = {
      name: options.projectName,
      version: "0.1.0",
      private: true,
      type: "module",
    };
  }

  // Ensure scripts object exists
  if (!pkg.scripts || typeof pkg.scripts !== "object") {
    pkg.scripts = {};
  }

  const scripts = pkg.scripts as Record<string, string>;

  // Add verify scripts
  if (options.includeGates) {
    const gateScripts: Record<string, string> = {
      "verify-agent-note-format": "tsx scripts/verify-agent-note-format.ts",
      "verify-agent-note-classification": "tsx scripts/verify-agent-note-classification.ts",
      "verify-md-links": "tsx scripts/verify-md-links.ts",
      "verify-md-wrap": "tsx scripts/verify-md-wrap.ts",
      "verify-doc-budgets": "tsx scripts/verify-doc-budgets.ts",
      "verify-export-jsdoc": "tsx scripts/verify-export-jsdoc.ts",
      "doc-sync": "tsx scripts/run-gates.ts doc-sync",
      "test:docs": "tsx scripts/run-gates.ts doc-quick",
    };

    for (const [key, value] of Object.entries(gateScripts)) {
      if (!(key in scripts)) {
        scripts[key] = value;
      }
    }
  }

  // Ensure devDependencies exist with tsx
  if (!pkg.devDependencies || typeof pkg.devDependencies !== "object") {
    pkg.devDependencies = {};
  }

  const devDeps = pkg.devDependencies as Record<string, string>;
  if (options.includeGates) {
    devDeps["tsx"] = devDeps["tsx"] || "^4.19.0";
    devDeps["typescript"] = devDeps["typescript"] || "^5.7.0";
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
}
