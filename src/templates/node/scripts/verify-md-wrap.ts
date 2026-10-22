#!/usr/bin/env tsx
/**
 * verify-md-wrap
 *
 * Enforces one physical line per paragraph in Markdown files.
 * Lists, code blocks, tables, and headings are exempt.
 *
 * Usage: tsx scripts/verify-md-wrap.ts [root]
 */

import { resolve, relative } from "node:path";
import { readFileSync } from "node:fs";
import { collectMarkdownFiles } from "./repo-files.js";

const ROOT = process.argv[2] ? resolve(process.argv[2]) : resolve(".");
const errors: string[] = [];

/** Lines that are exempt from the wrap rule. */
function isExemptLine(line: string): boolean {
  const trimmed = line.trimStart();
  // Headings, code fences, table rows, list items, blank lines, HTML blocks
  return (
    trimmed === "" ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("```") ||
    trimmed.startsWith("|") ||
    trimmed.startsWith("- ") ||
    trimmed.startsWith("* ") ||
    /^\d+\.\s/.test(trimmed) ||
    trimmed.startsWith(">") ||
    trimmed.startsWith("<!--") ||
    trimmed.startsWith("<") // HTML blocks
  );
}

function checkFile(filePath: string): void {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return;
  }

  const lines = content.split("\n");
  let inFence = false;
  let inFrontmatter = false;
  let frontmatterSeen = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track YAML frontmatter (--- delimited blocks)
    if (i < 5 && line.trim() === "---") {
      frontmatterSeen++;
      inFrontmatter = frontmatterSeen === 1;
      if (frontmatterSeen === 2) inFrontmatter = false;
      continue;
    }
    if (inFrontmatter) continue;

    // Track code fences
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }

    // Skip content inside code blocks
    if (inFence) continue;

    // Skip exempt lines
    if (isExemptLine(line)) continue;

    // Check if this is a continuation of a long paragraph
    // A "paragraph" is consecutive non-exempt, non-blank lines
    // We allow single lines (they ARE the paragraph)
    // We flag when a paragraph has been hard-wrapped into multiple lines
    if (i > 0) {
      const prev = lines[i - 1];
      const prevTrimmed = prev.trimStart();
      // If previous line was also a non-exempt text line, this is a wrapped paragraph
      if (
        prevTrimmed !== "" &&
        !isExemptLine(prev) &&
        !prevTrimmed.startsWith("```")
      ) {
        const rel = relative(ROOT, filePath).replace(/\\/g, "/");
        errors.push(
          `${rel}:${i + 1}: wrapped paragraph (line continues from previous). Use one physical line per paragraph with editor soft-wrap.`
        );
      }
    }
  }
}

// --- Main ---
const mdFiles = collectMarkdownFiles(ROOT);
const filtered = mdFiles.filter(
  (f) =>
    !/[/\\](node_modules|vendor|dist)[/\\]/.test(f) &&
    !/[/\\]src[/\\]/.test(f) &&
    !/[/\\]\.agents[/\\]notes[/\\]archived[/\\]/.test(f), // archived notes are frozen
);

for (const file of filtered) {
  checkFile(file);
}

if (errors.length === 0) {
  console.log(`✅ verify-md-wrap: ${filtered.length} files, no wrapped paragraphs`);
  process.exit(0);
} else {
  for (const err of errors) {
    console.error(`  ❌ ${err}`);
  }
  console.error(`\n❌ verify-md-wrap: ${errors.length} violation(s)`);
  process.exit(1);
}
