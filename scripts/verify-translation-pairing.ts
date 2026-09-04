#!/usr/bin/env tsx
/**
 * verify-translation-pairing — Translation pairing verification gate
 *
 * Checks that every .md file with a .zh.md counterpart also has a valid
 * .i18n.yaml sidecar recording their git blob hashes at last confirmed sync.
 *
 * Usage:
 *   tsx scripts/verify-translation-pairing.ts [--write] [--all] [file...]
 *
 * Options:
 *   --write   Update .i18n.yaml with current blob hashes (confirm sync)
 *   --all     Check all .md/.zh.md pairs in the repo
 *   file...   Check specific files (repo-relative paths to .md files)
 */

import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join, relative, dirname, basename, extname } from "node:path";
import { execSync } from "node:child_process";

// --- Types ---

interface TripletStatus {
  /** Repo-relative path to the English .md */
  enPath: string;
  /** Repo-relative path to the Chinese .zh.md */
  zhPath: string;
  /** Repo-relative path to the .i18n.yaml */
  i18nPath: string;
  /** Whether the .zh.md exists */
  zhExists: boolean;
  /** Whether the .i18n.yaml exists */
  i18nExists: boolean;
  /** Current git blob hash of English file */
  enHash: string | null;
  /** Current git blob hash of Chinese file */
  zhHash: string | null;
  /** Recorded hash in .i18n.yaml */
  enRecordedHash: string | null;
  /** Recorded hash in .i18n.yaml */
  zhRecordedHash: string | null;
  /** Whether English is in sync */
  enSynced: boolean;
  /** Whether Chinese is in sync */
  zhSynced: boolean;
}

// --- Utilities ---

const ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" })
  .trim()
  .replace(/\\/g, "/");

const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  "vendor",
]);

function gitHashObject(filePath: string): string | null {
  try {
    const abs = join(ROOT, filePath);
    return execSync(`git hash-object "${abs}"`, {
      encoding: "utf-8",
    }).trim();
  } catch {
    return null;
  }
}

function collectMdPairs(dir: string): string[] {
  const results: string[] = [];

  function walk(d: string): void {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(d, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry)) {
          walk(fullPath);
        }
      } else if (stat.isFile()) {
        if (
          entry.endsWith(".md") &&
          !entry.endsWith(".zh.md") &&
          !entry.endsWith(".i18n.yaml")
        ) {
          results.push(relative(ROOT, fullPath).replace(/\\/g, "/"));
        }
      }
    }
  }

  walk(dir);
  return results;
}

function parseI18nYaml(
  content: string
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^:]+):\s*([a-f0-9]+)$/);
    if (match) {
      result[match[1].trim()] = match[2].trim();
    }
  }
  return result;
}

function formatI18nYaml(
  enName: string,
  enHash: string,
  zhName: string,
  zhHash: string
): string {
  return `${enName}: ${enHash}\n${zhName}: ${zhHash}\n`;
}

// --- Core logic ---

function checkTriplet(mdPath: string): TripletStatus {
  const dir = dirname(mdPath);
  const name = basename(mdPath, extname(mdPath));
  const enName = basename(mdPath);
  const zhName = `${name}.zh.md`;
  const i18nName = `${name}.i18n.yaml`;

  const zhPath = dir ? `${dir}/${zhName}` : zhName;
  const i18nPath = dir ? `${dir}/${i18nName}` : i18nName;

  const zhExists = existsSync(join(ROOT, zhPath));
  const i18nExists = existsSync(join(ROOT, i18nPath));

  const enHash = gitHashObject(mdPath);
  const zhHash = zhExists ? gitHashObject(zhPath) : null;

  let enRecordedHash: string | null = null;
  let zhRecordedHash: string | null = null;

  if (i18nExists) {
    const content = readFileSync(join(ROOT, i18nPath), "utf-8");
    const parsed = parseI18nYaml(content);
    enRecordedHash = parsed[enName] ?? null;
    zhRecordedHash = parsed[zhName] ?? null;
  }

  const enSynced = enHash !== null && enHash === enRecordedHash;
  const zhSynced = zhHash !== null && zhHash === zhRecordedHash;

  return {
    enPath: mdPath,
    zhPath,
    i18nPath,
    zhExists,
    i18nExists,
    enHash,
    zhHash,
    enRecordedHash,
    zhRecordedHash,
    enSynced,
    zhSynced,
  };
}

function writeI18n(status: TripletStatus): void {
  if (!status.enHash || !status.zhHash) return;

  const enName = basename(status.enPath);
  const zhName = basename(status.zhPath);

  const content = formatI18nYaml(enName, status.enHash, zhName, status.zhHash);
  writeFileSync(join(ROOT, status.i18nPath), content, "utf-8");
}

// --- Main ---

function main(): void {
  const args = process.argv.slice(2);
  const writeMode = args.includes("--write");
  const allMode = args.includes("--all");
  const files = args.filter((a) => !a.startsWith("--"));

  let mdFiles: string[];

  if (allMode) {
    mdFiles = collectMdPairs(ROOT);
  } else if (files.length > 0) {
    mdFiles = files.map((f) => f.replace(/\\/g, "/"));
  } else {
    console.error(
      "Usage: tsx scripts/verify-translation-pairing.ts [--write] [--all] [file...]"
    );
    process.exit(1);
  }

  let errors = 0;
  let written = 0;
  let skipped = 0;

  for (const mdPath of mdFiles) {
    const status = checkTriplet(mdPath);

    // Only care about files that have a .zh.md counterpart
    if (!status.zhExists) {
      skipped++;
      continue;
    }

    // Write mode: update i18n.yaml
    if (writeMode) {
      writeI18n(status);
      written++;
      console.log(`  ✅ ${status.i18nPath} — updated`);
      continue;
    }

    // Check mode: verify sync
    if (!status.i18nExists) {
      console.error(
        `  ❌ ${status.i18nPath} — missing (run with --write to create)`
      );
      errors++;
      continue;
    }

    const issues: string[] = [];
    if (!status.enSynced) {
      issues.push(
        `English changed (recorded: ${status.enRecordedHash?.slice(0, 8)}, current: ${status.enHash?.slice(0, 8)})`
      );
    }
    if (!status.zhSynced) {
      issues.push(
        `Chinese changed (recorded: ${status.zhRecordedHash?.slice(0, 8)}, current: ${status.zhHash?.slice(0, 8)})`
      );
    }

    if (issues.length > 0) {
      console.error(`  ❌ ${status.enPath} — out of sync:`);
      for (const issue of issues) {
        console.error(`     ${issue}`);
      }
      errors++;
    } else {
      console.log(`  ✅ ${status.enPath} — in sync`);
    }
  }

  // Summary
  console.log("");
  if (writeMode) {
    console.log(`✅ Updated ${written} i18n.yaml file(s)${skipped > 0 ? ` (${skipped} without .zh.md skipped)` : ""}`);
  } else if (errors === 0) {
    console.log(`✅ All ${mdFiles.length - skipped} triplet(s) in sync${skipped > 0 ? ` (${skipped} without .zh.md skipped)` : ""}`);
  } else {
    console.log(
      `❌ ${errors} triplet(s) out of sync, ${mdFiles.length - errors - skipped} in sync`
    );
    process.exit(1);
  }
}

main();
