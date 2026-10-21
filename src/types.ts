/**
 * Shared vocabulary for the scaffolder: CLI flags, detected project facts,
 * resolved options, and the file plan the CLI reports on.
 */

/** Stack profile emitted by the scaffolder. */
export type TemplateId = "node" | "python" | "generic";

/** User-facing template selector, including automatic detection. */
export type TemplateChoice = TemplateId | "auto";

/** Package managers supported for the Node profile. */
export type PackageManager = "npm" | "pnpm" | "yarn";

/** Raw commander flags before validation and detection. */
export interface CliFlags {
  directory?: string;
  template?: string;
  name?: string;
  lang?: string;
  pm?: string;
  monorepo?: boolean;
  gates?: boolean;
  skills?: boolean;
  install?: boolean;
  git?: boolean;
  dryRun?: boolean;
  json?: boolean;
  force?: boolean;
  yes?: boolean;
  skillOnly?: boolean;
  global?: boolean;
}

/** Facts about the target directory that shape what the scaffolder emits. */
export interface ProjectFacts {
  /** Absolute path being scaffolded. */
  root: string;
  /** Detected or directory-derived project name. */
  projectName: string;
  /** Detected stack profile. */
  template: TemplateId;
  /** Package manager selected for Node commands. */
  packageManager: PackageManager;
  packageManagerSource: "lockfile" | "manifest" | "default";
  /** Workspace manifest or package directories were detected. */
  monorepo: boolean;
  hasGit: boolean;
  hasCi: boolean;
  /** Instruction surfaces already present in the target directory. */
  instructionFiles: string[];
  /** Top-level source directories, derived from the directory listing. */
  sourceDirs: string[];
  /** Scripts declared in package.json. */
  nodeScripts: Record<string, string>;
  hasPackageJson: boolean;
  hasTsconfig: boolean;
  hasPyProject: boolean;
  hasRequirements: boolean;
  hasPytest: boolean;
  hasTestsDir: boolean;
  /** A `.zh.md` companion or Chinese prose already exists. */
  bilingualDocs: boolean;
  /** Interpreter used in generated Python commands. */
  pythonInterpreter: string;
}

/** Validated options that drive planning. */
export interface InitOptions {
  /** Absolute target directory. */
  targetDir: string;
  projectName: string;
  template: TemplateId;
  packageManager: PackageManager;
  bilingual: boolean;
  includeGates: boolean;
  includeSkills: boolean;
  monorepo: boolean;
  force: boolean;
  dryRun: boolean;
  install: boolean;
  git: boolean;
  json: boolean;
  skillOnly: boolean;
  global: boolean;
  yes: boolean;
}

/** A file the scaffolder intends to write. */
export interface PlannedFile {
  /** Target path relative to the project root, using forward slashes. */
  path: string;
  content: string;
  /** Template path that produced the content, or "generated". */
  source: string;
}

/** Declarative update to an existing JSON manifest such as package.json. */
export interface PlannedJsonUpdate {
  path: string;
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
  /** Keys written only when the file does not exist yet. */
  createOnly: Record<string, unknown>;
}

/** Complete, side-effect-free description of a scaffold run. */
export interface ScaffoldPlan {
  files: PlannedFile[];
  jsonUpdates: PlannedJsonUpdate[];
}

/** How one planned file settled on disk. */
export type FileAction = "created" | "overwritten" | "unchanged" | "kept";

/** Outcome for one planned file. */
export interface FileOutcome {
  path: string;
  action: FileAction;
}

/** Outcome for one JSON manifest merge. */
export interface JsonUpdateOutcome {
  path: string;
  changed: boolean;
  addedScripts: string[];
  addedDevDependencies: string[];
  keptKeys: string[];
}

/** Result of applying a plan. */
export interface ApplyResult {
  files: FileOutcome[];
  jsonUpdates: JsonUpdateOutcome[];
  errors: string[];
}

/** Everything the reporter needs after a run. */
export interface ScaffoldReport {
  facts: ProjectFacts;
  options: InitOptions;
  plan: ScaffoldPlan;
  applied: ApplyResult;
  /** Commands executed after files were written, e.g. install or git init. */
  postActions: string[];
  postActionErrors: string[];
}

/** Raised when the user supplied an unsupported flag value. */
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}
