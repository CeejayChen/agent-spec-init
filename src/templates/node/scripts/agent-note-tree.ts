/**
 * Shared tree walker for Agent Notes.
 * Discovers notes under .agents/notes/{lifecycle}/{class}/yyyy-mm-dd-*.md
 * and validates structural rules (depth, naming, classification).
 */

import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** The closed set of lifecycle folders. */
export const LIFECYCLES = ["proposed", "implemented", "rejected"] as const;
/** One lifecycle folder name. */
export type Lifecycle = (typeof LIFECYCLES)[number];

/** The closed set of classification folders. */
export const CLASSES = [
  "architecture",
  "process",
  "testing",
  "feature",
  "bug-fix",
  "simplification",
] as const;
/** One classification folder name. */
export type NoteClass = (typeof CLASSES)[number];

/** Files allowed at the root of .agents/notes/ without being notes. */
const ALLOWED_ROOT_FILES = new Set(["README.md", "AGENTS.md", "CLAUDE.md"]);

/** Filename pattern: yyyy-mm-dd-something.md (English only, not .zh.md) */
const FILENAME_RE = /^\d{4}-\d{2}-\d{2}-.+\.md$/;
const ZH_SUFFIX = ".zh.md";

/** One discovered Agent Note. */
export interface NoteEntry {
  /** Absolute path to the English .md file */
  path: string;
  /** Repo-relative path */
  relPath: string;
  /** Lifecycle folder */
  lifecycle: Lifecycle;
  /** Classification folder */
  noteClass: NoteClass;
  /** Filename (e.g. "2026-09-03-my-decision.md") */
  filename: string;
  /** Date prefix extracted from filename */
  date: string;
}

/** Notes found by the walk plus structural errors. */
export interface WalkResult {
  notes: NoteEntry[];
  errors: string[];
}

/**
 * Walk the .agents/notes tree and return all discovered notes plus validation errors.
 */
export function walkAgentNoteTree(notesRoot: string): WalkResult {
  const notes: NoteEntry[] = [];
  const errors: string[] = [];

  let entries: string[];
  try {
    entries = readdirSync(notesRoot);
  } catch {
    return { notes, errors: [`Cannot read notes directory: ${notesRoot}`] };
  }

  for (const entry of entries) {
    const fullPath = join(notesRoot, entry);
    const stat = statSync(fullPath);

    if (stat.isFile()) {
      if (ALLOWED_ROOT_FILES.has(entry)) continue;
      if (entry.endsWith(".i18n.yaml")) continue;
      if (entry.endsWith(ZH_SUFFIX)) continue;
      errors.push(`Unexpected file at notes root: ${entry}`);
      continue;
    }

    if (!stat.isDirectory()) continue;

    const lifecycle = entry as Lifecycle;
    if (!LIFECYCLES.includes(lifecycle)) {
      if (entry === "archived") continue; // recognized but not walked
      errors.push(`Unknown lifecycle folder: ${entry}`);
      continue;
    }

    // Walk lifecycle/class/filename
    let classEntries: string[];
    try {
      classEntries = readdirSync(fullPath);
    } catch {
      errors.push(`Cannot read lifecycle folder: ${entry}`);
      continue;
    }

    for (const clsEntry of classEntries) {
      const clsPath = join(fullPath, clsEntry);
      const clsStat = statSync(clsPath);

      if (clsStat.isFile()) {
        if (clsEntry === "AGENTS.md" || clsEntry === "CLAUDE.md") continue;
        errors.push(
          `Unexpected file at lifecycle root: ${lifecycle}/${clsEntry}`
        );
        continue;
      }

      if (!clsStat.isDirectory()) continue;

      const noteClass = clsEntry as NoteClass;
      if (!CLASSES.includes(noteClass)) {
        errors.push(
          `Unknown class folder: ${lifecycle}/${clsEntry} (allowed: ${CLASSES.join(", ")})`
        );
        continue;
      }

      let noteFiles: string[];
      try {
        noteFiles = readdirSync(clsPath);
      } catch {
        errors.push(`Cannot read class folder: ${lifecycle}/${clsEntry}`);
        continue;
      }

      for (const file of noteFiles) {
        if (file.endsWith(ZH_SUFFIX)) continue; // skip Chinese counterparts
        if (file.endsWith(".i18n.yaml")) continue; // skip sidecars
        if (file === ".gitkeep") continue; // skip directory placeholders

        if (!FILENAME_RE.test(file)) {
          errors.push(
            `Filename does not match yyyy-mm-dd-*.md pattern: ${lifecycle}/${clsEntry}/${file}`
          );
          continue;
        }

        const date = file.slice(0, 10);
        notes.push({
          path: join(clsPath, file),
          relPath: relative(notesRoot, join(clsPath, file)),
          lifecycle,
          noteClass,
          filename: file,
          date,
        });
      }
    }
  }

  return { notes, errors };
}
