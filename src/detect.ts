/**
 * Reads the target repository and reports what the scaffolder should assume.
 * Every fact here comes from the filesystem; nothing is guessed when a file
 * can answer the question.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { PackageManager, ProjectFacts, TemplateId } from "./types.js";

/** Directories that hold dependencies, build output, or tool state. */
const SKIP_DIRS = new Set([
  ".git",
  ".github",
  ".agents",
  ".venv",
  ".next",
  ".turbo",
  ".cache",
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  "target",
  "vendor",
  "venv",
  "__pycache__",
]);

/** Instruction files other tools read; their rules must survive a bootstrap. */
const INSTRUCTION_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".cursorrules",
  ".windsurfrules",
  ".github/copilot-instructions.md",
];

/** Read a UTF-8 file, or null when it cannot be read. */
function readText(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

/** Parse a JSON file, or null when it is missing or malformed. */
function readJson(path: string): Record<string, unknown> | null {
  const text = readText(path);
  if (text === null) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** True when the path exists and is a directory. */
function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** True when the path exists and is a file. */
function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** Directory entries, or an empty list when the directory cannot be read. */
function entries(path: string): string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

/** Count source files by extension, walking at most `maxDepth` levels. */
function countSourceFiles(root: string, extensions: string[], maxDepth = 3): number {
  let count = 0;

  function walk(dir: string, depth: number): void {
    if (depth > maxDepth) return;
    for (const entry of entries(dir)) {
      if (SKIP_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      if (isDirectory(fullPath)) {
        walk(fullPath, depth + 1);
      } else if (extensions.some((ext) => entry.endsWith(ext))) {
        count++;
      }
    }
  }

  walk(root, 0);
  return count;
}

/** Extract `name = "..."` from a TOML manifest. */
function tomlName(text: string): string | null {
  const match = text.match(/^\s*name\s*=\s*"([^"]+)"/m);
  return match ? match[1] : null;
}

/** Derive the project name from whichever manifest the repository carries. */
export function detectProjectName(root: string): string {
  const pkg = readJson(join(root, "package.json"));
  if (pkg && typeof pkg.name === "string" && pkg.name.trim() !== "") {
    return pkg.name.trim();
  }

  const pyproject = readText(join(root, "pyproject.toml"));
  if (pyproject) {
    const name = tomlName(pyproject);
    if (name) return name;
  }

  const cargo = readText(join(root, "Cargo.toml"));
  if (cargo) {
    const name = tomlName(cargo);
    if (name) return name;
  }

  const goMod = readText(join(root, "go.mod"));
  if (goMod) {
    const match = goMod.match(/^module\s+(\S+)/m);
    if (match) return basename(match[1]);
  }

  return basename(resolve(root));
}

/** Pick the package manager from lockfiles first, then the manifest field. */
export function detectPackageManager(root: string): {
  packageManager: PackageManager;
  source: "lockfile" | "manifest" | "default";
} {
  const lockfiles: Array<[string, PackageManager]> = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
    ["npm-shrinkwrap.json", "npm"],
  ];

  for (const [file, packageManager] of lockfiles) {
    if (isFile(join(root, file))) {
      return { packageManager, source: "lockfile" };
    }
  }

  const pkg = readJson(join(root, "package.json"));
  const declared = pkg?.packageManager;
  if (typeof declared === "string") {
    const name = declared.split("@")[0];
    if (name === "npm" || name === "pnpm" || name === "yarn") {
      return { packageManager: name, source: "manifest" };
    }
  }

  return { packageManager: "npm", source: "default" };
}

/** Detect whether the repository is a workspace monorepo. */
export function detectMonorepo(root: string): boolean {
  if (isFile(join(root, "pnpm-workspace.yaml"))) return true;

  const pkg = readJson(join(root, "package.json"));
  const workspaces = pkg?.workspaces;
  if (Array.isArray(workspaces) && workspaces.length > 0) return true;

  for (const parent of ["packages", "apps"]) {
    const parentPath = join(root, parent);
    if (!isDirectory(parentPath)) continue;
    for (const entry of entries(parentPath)) {
      const child = join(parentPath, entry);
      if (
        isFile(join(child, "package.json")) ||
        isFile(join(child, "pyproject.toml"))
      ) {
        return true;
      }
    }
  }

  return false;
}

/** Choose a stack profile from the manifests and source file mix. */
export function detectTemplate(root: string): TemplateId {
  const pkg = readJson(join(root, "package.json"));
  const hasPyProject =
    isFile(join(root, "pyproject.toml")) || isFile(join(root, "setup.py"));
  const hasRequirements = isFile(join(root, "requirements.txt"));

  const nodeFiles = countSourceFiles(root, [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
  const pythonFiles = countSourceFiles(root, [".py"]);

  if (hasPyProject) {
    if (nodeFiles > 0 && nodeFiles >= pythonFiles) return "node";
    return "python";
  }

  if (pkg !== null) return "node";
  if (nodeFiles > 0 && nodeFiles >= pythonFiles) return "node";
  if (pythonFiles > 0) return "python";
  if (hasRequirements) return "python";

  return "generic";
}

/** Top-level directories that are project content rather than scaffolding. */
export function detectSourceDirs(root: string): string[] {
  const excluded = new Set([
    ...SKIP_DIRS,
    "docs",
    "scripts",
    "tests",
    "test",
    "spec",
    "specs",
  ]);

  return entries(root)
    .filter((entry) => !excluded.has(entry))
    .filter((entry) => !entry.startsWith("."))
    .filter((entry) => isDirectory(join(root, entry)))
    .sort();
}

/** Instruction surfaces that already exist and must not be overwritten blindly. */
export function detectInstructionFiles(root: string): string[] {
  const found = INSTRUCTION_FILES.filter((file) => isFile(join(root, file)));
  if (isDirectory(join(root, ".cursor", "rules"))) found.push(".cursor/rules");
  if (isDirectory(join(root, ".specify"))) found.push(".specify/");
  if (isDirectory(join(root, "openspec"))) found.push("openspec/");
  return found;
}

/** CI configuration exists and can run the gates. */
function detectCi(root: string): boolean {
  const workflows = join(root, ".github", "workflows");
  return entries(workflows).some(
    (entry) => entry.endsWith(".yml") || entry.endsWith(".yaml"),
  );
}

/** A translation pair or Chinese documentation already exists. */
function detectBilingual(root: string): boolean {
  const candidates = [
    "README.md",
    ...entries(root)
      .filter((entry) => entry.endsWith(".md"))
      .slice(0, 20),
  ];
  if (candidates.some((file) => isFile(join(root, file.replace(/\.md$/, ".zh.md"))))) {
    return true;
  }
  const readme = readText(join(root, "README.md"));
  return readme !== null && /[\u4e00-\u9fff]/.test(readme);
}

/** Read package.json scripts without assuming their value types. */
function readNodeScripts(root: string): Record<string, string> {
  const pkg = readJson(join(root, "package.json"));
  const scripts = pkg?.scripts;
  if (typeof scripts !== "object" || scripts === null) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(scripts)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

/** Detect a Python test runner from configuration files or a tests directory. */
function detectPytest(root: string): boolean {
  if (
    isFile(join(root, "pytest.ini")) ||
    isFile(join(root, "conftest.py")) ||
    isFile(join(root, "tox.ini"))
  ) {
    return true;
  }
  const pyproject = readText(join(root, "pyproject.toml"));
  if (pyproject !== null && pyproject.includes("[tool.pytest")) return true;
  return isDirectory(join(root, "tests")) || isDirectory(join(root, "test"));
}

/** True when `git` is on PATH; generated instructions may name it. */
export function gitAvailable(): boolean {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Inspect a directory and return every fact the planner needs.
 *
 * @param root Absolute directory to inspect.
 * @returns Detected stack, tooling, and existing specification surfaces.
 */
export function detectProject(root: string): ProjectFacts {
  const absolute = resolve(root);
  const { packageManager, source } = detectPackageManager(absolute);
  const pkg = readJson(join(absolute, "package.json"));

  return {
    root: absolute,
    projectName: detectProjectName(absolute),
    template: detectTemplate(absolute),
    packageManager,
    packageManagerSource: source,
    monorepo: detectMonorepo(absolute),
    hasGit: isDirectory(join(absolute, ".git")),
    hasCi: detectCi(absolute),
    instructionFiles: detectInstructionFiles(absolute),
    sourceDirs: detectSourceDirs(absolute),
    nodeScripts: readNodeScripts(absolute),
    hasPackageJson: pkg !== null,
    hasTsconfig: isFile(join(absolute, "tsconfig.json")),
    hasPyProject:
      isFile(join(absolute, "pyproject.toml")) ||
      isFile(join(absolute, "setup.py")),
    hasRequirements: isFile(join(absolute, "requirements.txt")),
    hasPytest: detectPytest(absolute),
    hasTestsDir:
      isDirectory(join(absolute, "tests")) ||
      isDirectory(join(absolute, "test")),
    bilingualDocs: detectBilingual(absolute),
    pythonInterpreter: process.platform === "win32" ? "python" : "python3",
  };
}

/** Facts for a directory that does not exist yet (create-style invocation). */
export function emptyFacts(directory: string): ProjectFacts {
  const absolute = resolve(directory);
  return {
    root: absolute,
    projectName: basename(absolute),
    template: "generic",
    packageManager: "npm",
    packageManagerSource: "default",
    monorepo: false,
    hasGit: false,
    hasCi: false,
    instructionFiles: [],
    sourceDirs: [],
    nodeScripts: {},
    hasPackageJson: false,
    hasTsconfig: false,
    hasPyProject: false,
    hasRequirements: false,
    hasPytest: false,
    hasTestsDir: false,
    bilingualDocs: false,
    pythonInterpreter: process.platform === "win32" ? "python" : "python3",
  };
}

/** True when a path exists at all. */
export function pathExists(path: string): boolean {
  return existsSync(path);
}
