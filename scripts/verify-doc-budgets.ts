#!/usr/bin/env tsx
/**
 * verify-doc-budgets
 *
 * Enforces word-count ceilings on key documentation files.
 * Budgets are defined in scripts/doc-budgets.manifest.json.
 *
 * Usage: tsx scripts/verify-doc-budgets.ts [--list]
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";

const ROOT = resolve(".");
const MANIFEST_PATH = resolve("scripts", "doc-budgets.manifest.json");
const isListMode = process.argv.includes("--list");

interface BudgetEntry {
  path: string;
  ceiling: number;
}

function loadManifest(): BudgetEntry[] {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`❌ Manifest not found: ${MANIFEST_PATH}`);
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  return Object.entries(raw).map(([path, ceiling]) => ({
    path,
    ceiling: ceiling as number,
  }));
}

function countWords(content: string): number {
  return content.split(/\s+/).filter((w) => w.length > 0).length;
}

// --- Main ---
const entries = loadManifest();
const errors: string[] = [];
const reports: { path: string; words: number; ceiling: number; pct: number }[] = [];

for (const entry of entries) {
  const fullPath = resolve(ROOT, entry.path);

  if (!existsSync(fullPath)) {
    errors.push(`${entry.path}: file listed in manifest but not found`);
    continue;
  }

  const content = readFileSync(fullPath, "utf-8");
  const words = countWords(content);
  const pct = Math.round((words / entry.ceiling) * 100);

  reports.push({ path: entry.path, words, ceiling: entry.ceiling, pct });

  if (words > entry.ceiling) {
    errors.push(
      `${entry.path}: ${words} words (ceiling ${entry.ceiling}, ${pct}% — over by ${words - entry.ceiling})`
    );
  }
}

if (isListMode) {
  console.log("Document budgets:");
  for (const r of reports) {
    const status = r.pct > 100 ? "❌" : r.pct > 95 ? "⚠️" : "✅";
    console.log(`  ${status} ${r.path}: ${r.words}/${r.ceiling} (${r.pct}%)`);
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

if (errors.length === 0) {
  console.log(`✅ verify-doc-budgets: ${entries.length} files within budget`);
  process.exit(0);
} else {
  for (const err of errors) {
    console.error(`  ❌ ${err}`);
  }
  console.error(`\n❌ verify-doc-budgets: ${errors.length} violation(s)`);
  process.exit(1);
}
