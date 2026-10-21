/**
 * Writes a scaffold plan to disk.
 *
 * Existing files are never overwritten unless `--force` was passed, and an
 * existing package.json script keeps its value even then: the scaffold adds
 * missing keys and reports every key it left alone.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type {
  ApplyResult,
  FileAction,
  FileOutcome,
  InitOptions,
  JsonUpdateOutcome,
  PlannedFile,
  PlannedJsonUpdate,
  ScaffoldPlan,
} from "./types.js";

/** True when the path exists as a regular file. */
function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** Read a UTF-8 file, or null when it is missing. */
function readText(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

/** Write one planned file and classify the outcome. */
function writeFile(
  targetDir: string,
  file: PlannedFile,
  force: boolean,
): FileOutcome {
  const fullPath = join(targetDir, file.path);
  const existing = isFile(fullPath) ? readText(fullPath) : null;

  if (existing === null) {
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, file.content, "utf-8");
    return { path: file.path, action: "created" };
  }

  if (existing === file.content) {
    return { path: file.path, action: "unchanged" };
  }

  if (!force) {
    return { path: file.path, action: "kept" };
  }

  writeFileSync(fullPath, file.content, "utf-8");
  return { path: file.path, action: "overwritten" };
}

/** Merge scripts and devDependencies into a JSON manifest. */
function mergeJson(
  targetDir: string,
  update: PlannedJsonUpdate,
  force: boolean,
): JsonUpdateOutcome {
  const fullPath = join(targetDir, update.path);
  const outcome: JsonUpdateOutcome = {
    path: update.path,
    changed: false,
    addedScripts: [],
    addedDevDependencies: [],
    keptKeys: [],
  };

  let document: Record<string, unknown> = {};
  const existing = isFile(fullPath) ? readText(fullPath) : null;
  if (existing !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(existing);
    } catch (err) {
      throw new Error(`${update.path} is not valid JSON: ${String(err)}`);
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${update.path} must contain a JSON object`);
    }
    document = parsed as Record<string, unknown>;
  } else {
    Object.assign(document, update.createOnly);
  }

  let scripts: Record<string, string>;
  if (existing === null) {
    scripts = {};
  } else if (typeof document.scripts === "object" && document.scripts !== null && !Array.isArray(document.scripts)) {
    scripts = document.scripts as Record<string, string>;
  } else {
    scripts = {};
  }
  for (const [name, command] of Object.entries(update.scripts)) {
    if (!(name in scripts)) {
      scripts[name] = command;
      outcome.addedScripts.push(name);
    } else if (force && scripts[name] !== command) {
      scripts[name] = command;
      outcome.addedScripts.push(name);
    } else if (scripts[name] !== command) {
      outcome.keptKeys.push(`scripts.${name}`);
    }
  }
  document.scripts = scripts;

  let devDependencies: Record<string, string>;
  if (existing === null) {
    devDependencies = {};
  } else if (
    typeof document.devDependencies === "object" &&
    document.devDependencies !== null &&
    !Array.isArray(document.devDependencies)
  ) {
    devDependencies = document.devDependencies as Record<string, string>;
  } else {
    devDependencies = {};
  }
  for (const [name, range] of Object.entries(update.devDependencies)) {
    if (!(name in devDependencies)) {
      devDependencies[name] = range;
      outcome.addedDevDependencies.push(name);
    } else {
      outcome.keptKeys.push(`devDependencies.${name}`);
    }
  }
  document.devDependencies = devDependencies;

  outcome.changed =
    existing === null ||
    outcome.addedScripts.length > 0 ||
    outcome.addedDevDependencies.length > 0;

  if (outcome.changed) {
    writeFileSync(fullPath, `${JSON.stringify(document, null, 2)}\n`, "utf-8");
  }

  return outcome;
}

/**
 * Describe what `applyPlan` would do without writing anything.
 *
 * @param plan Files and manifest updates to preview.
 * @param options Resolved options.
 * @returns Predicted per-file outcomes and manifest updates.
 */
export function previewPlan(
  plan: ScaffoldPlan,
  options: InitOptions,
): ApplyResult {
  const result: ApplyResult = { files: [], jsonUpdates: [], errors: [] };

  for (const file of plan.files) {
    const fullPath = join(options.targetDir, file.path);
    const existing = isFile(fullPath) ? readText(fullPath) : null;
    let action: FileAction;
    if (existing === null) {
      action = "created";
    } else if (existing === file.content) {
      action = "unchanged";
    } else {
      action = options.force ? "overwritten" : "kept";
    }
    result.files.push({ path: file.path, action });
  }

  for (const update of plan.jsonUpdates) {
    const fullPath = join(options.targetDir, update.path);
    const existing = isFile(fullPath) ? readText(fullPath) : null;
    let addedScripts = Object.keys(update.scripts);
    let addedDevDependencies = Object.keys(update.devDependencies);

    if (existing !== null) {
      try {
        const parsed = JSON.parse(existing) as Record<string, unknown>;
        const scripts =
          typeof parsed.scripts === "object" && parsed.scripts !== null
            ? (parsed.scripts as Record<string, unknown>)
            : {};
        const devDependencies =
          typeof parsed.devDependencies === "object" && parsed.devDependencies !== null
            ? (parsed.devDependencies as Record<string, unknown>)
            : {};
        addedScripts = addedScripts.filter((name) => !(name in scripts));
        addedDevDependencies = addedDevDependencies.filter((name) => !(name in devDependencies));
      } catch {
        // Invalid JSON is reported by applyPlan; the preview keeps the planned keys.
      }
    }

    result.jsonUpdates.push({
      path: update.path,
      changed:
        existing === null || addedScripts.length > 0 || addedDevDependencies.length > 0,
      addedScripts,
      addedDevDependencies,
      keptKeys: [],
    });
  }

  return result;
}

/**
 * Apply a plan to the target directory.
 *
 * @param plan Files and manifest updates to write.
 * @param options Resolved options; `force` allows overwriting files.
 * @returns Per-file outcomes plus any write errors.
 */
export function applyPlan(plan: ScaffoldPlan, options: InitOptions): ApplyResult {
  const result: ApplyResult = { files: [], jsonUpdates: [], errors: [] };

  if (!existsSync(options.targetDir)) {
    mkdirSync(options.targetDir, { recursive: true });
  }

  for (const file of plan.files) {
    try {
      result.files.push(writeFile(options.targetDir, file, options.force));
    } catch (err) {
      result.errors.push(`${file.path}: ${String(err)}`);
    }
  }

  for (const update of plan.jsonUpdates) {
    try {
      result.jsonUpdates.push(mergeJson(options.targetDir, update, options.force));
    } catch (err) {
      result.errors.push(`${update.path}: ${String(err)}`);
    }
  }

  return result;
}
