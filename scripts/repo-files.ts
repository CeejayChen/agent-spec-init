/**
 * Shared file discovery utilities for verify gates.
 * Provides glob-based file finding with deduplication and exclusion support.
 */

import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * Recursively collect files matching the given extensions.
 * Skips node_modules, dist, .git, and vendor directories.
 */
export function collectFiles(
  root: string,
  extensions: string[],
  excludeDirs: string[] = ["node_modules", "dist", ".git", "vendor"]
): string[] {
  const results: string[] = [];
  const excluded = new Set(excludeDirs);

  function walk(dir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        if (!excluded.has(entry)) {
          walk(fullPath);
        }
      } else if (stat.isFile()) {
        if (extensions.some((ext) => entry.endsWith(ext))) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(root);
  return results;
}

/**
 * Collect all Markdown files in the repo (excluding node_modules, dist, .git, vendor).
 */
export function collectMarkdownFiles(root: string): string[] {
  return collectFiles(root, [".md"]);
}

/**
 * Read a file and return its lines, or null if the file cannot be read.
 */
export function readLines(filePath: string): string[] | null {
  try {
    return readFileSync(filePath, "utf-8").split("\n");
  } catch {
    return null;
  }
}
