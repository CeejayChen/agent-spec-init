#!/usr/bin/env tsx
/**
 * verify-md-links
 *
 * Validates that all relative Markdown links in .md files point to existing
 * files and that #fragment anchors exist in the target.
 *
 * Usage: tsx scripts/verify-md-links.ts [root]
 */

import { resolve, dirname, join, relative } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { collectMarkdownFiles } from "./repo-files.js";

const ROOT = process.argv[2] ? resolve(process.argv[2]) : resolve(".");
const errors: string[] = [];

/** Extract relative Markdown links: [text](path) or [text](path#anchor) */
const LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
/** Match relative links only (skip http, mailto, #anchor-only) */
const RELATIVE_RE = /^(?![a-z]+:)(?!#)/;

interface Violation {
  file: string;
  line: number;
  link: string;
  reason: string;
}

const violations: Violation[] = [];

function checkFile(filePath: string): void {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return;
  }

  const lines = content.split("\n");
  const fileDir = dirname(filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip code blocks
    if (line.startsWith("```")) {
      // Find end of code block
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith("```")) {
          i = j;
          break;
        }
      }
      continue;
    }

    let match: RegExpExecArray | null;
    LINK_RE.lastIndex = 0;
    while ((match = LINK_RE.exec(line)) !== null) {
      const link = match[2];

      // Skip non-relative links
      if (!RELATIVE_RE.test(link)) continue;

      // Split path and anchor
      const [linkPath, anchor] = link.split("#", 2);

      // Resolve the target
      const targetPath = linkPath
        ? resolve(fileDir, linkPath)
        : filePath; // anchor-only link points to same file

      if (!existsSync(targetPath)) {
        violations.push({
          file: filePath,
          line: i + 1,
          link,
          reason: `target not found: ${targetPath}`,
        });
        continue;
      }

      // Check anchor if present
      if (anchor && targetPath.endsWith(".md")) {
        let targetContent: string;
        try {
          targetContent = readFileSync(targetPath, "utf-8");
        } catch {
          continue;
        }

        // Generate slug from headings: "## Foo Bar" -> "foo-bar"
        const headingSlugs = targetContent
          .split("\n")
          .filter((l) => /^#{1,6}\s/.test(l))
          .map((l) =>
            l
              .replace(/^#{1,6}\s+/, "")
              .toLowerCase()
              .replace(/[^\p{L}\p{N}\s-]/gu, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-")
          );

        if (!headingSlugs.includes(anchor.toLowerCase())) {
          violations.push({
            file: filePath,
            line: i + 1,
            link,
            reason: `anchor #${anchor} not found in ${targetPath}`,
          });
        }
      }
    }
  }
}

// --- Main ---
const mdFiles = collectMarkdownFiles(ROOT);

// Exclude vendor, node_modules, dist, and src (contains non-doc source files)
const filtered = mdFiles.filter(
  (f) =>
    !f.includes("node_modules") &&
    !f.includes("vendor") &&
    !f.includes("dist") &&
    !/[/\\]src[/\\]/.test(f)
);

for (const file of filtered) {
  checkFile(file);
}

if (violations.length === 0) {
  console.log(`✅ verify-md-links: ${filtered.length} files, all links valid`);
  process.exit(0);
} else {
  for (const v of violations) {
    const rel = relative(ROOT, v.file);
    console.error(`  ❌ ${rel}:${v.line}  ${v.link}  — ${v.reason}`);
  }
  console.error(`\n❌ verify-md-links: ${violations.length} violation(s)`);
  process.exit(1);
}
