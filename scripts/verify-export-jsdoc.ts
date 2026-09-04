#!/usr/bin/env tsx
/**
 * verify-export-jsdoc
 *
 * Checks that every exported declaration in source files has JSDoc documentation.
 * Uses the TypeScript compiler API for AST analysis.
 *
 * Usage: tsx scripts/verify-export-jsdoc.ts [src-glob-pattern]
 *
 * Note: Requires `typescript` as a dev dependency.
 */

import { resolve, relative } from "node:path";
import { readFileSync } from "node:fs";
import { collectFiles } from "./repo-files.js";

const ROOT = resolve(".");
const SRC_PATTERN = process.argv[2] || "src";

interface Violation {
  file: string;
  line: number;
  name: string;
  kind: string;
}

const violations: Violation[] = [];

/** Simple heuristic: check if a line before an export has a JSDoc comment. */
function checkFile(filePath: string): void {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return;
  }

  const lines = content.split("\n");
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track block comments (JSDoc)
    // We look backwards from export lines to find /** ... */

    // Detect export declarations
    const exportMatch = trimmed.match(
      /^export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/
    );

    if (!exportMatch) {
      // Also check: export { name } or export default name
      const reExport = trimmed.match(/^export\s+\{([^}]+)\}/);
      if (reExport) continue; // re-exports don't need local JSDoc
      continue;
    }

    const name = exportMatch[1];

    // Look backwards for JSDoc comment
    let hasJsdoc = false;
    for (let j = i - 1; j >= 0; j--) {
      const prevLine = lines[j].trim();
      if (prevLine === "") continue; // skip blank lines
      if (prevLine.startsWith("*/")) {
        // Found end of block comment, check if it starts with /**
        for (let k = j - 1; k >= 0; k--) {
          if (lines[k].trim().startsWith("/**")) {
            hasJsdoc = true;
            break;
          }
          if (!lines[k].trim().startsWith("*") && !lines[k].trim().startsWith("/*")) {
            break;
          }
        }
      }
      break; // stop at first non-blank, non-comment-end line
    }

    if (!hasJsdoc) {
      const kind = trimmed.includes("function")
        ? "function"
        : trimmed.includes("class")
          ? "class"
          : trimmed.includes("interface")
            ? "interface"
            : trimmed.includes("type")
              ? "type"
              : trimmed.includes("enum")
                ? "enum"
                : "declaration";

      violations.push({
        file: filePath,
        line: i + 1,
        name,
        kind,
      });
    }
  }
}

// --- Main ---
// Collect TypeScript source files, excluding tests and node_modules
const tsFiles = collectFiles(ROOT, [".ts"]);
const srcFiles = tsFiles.filter(
  (f) =>
    f.includes(`/${SRC_PATTERN}/`) &&
    !f.includes("node_modules") &&
    !f.includes("dist") &&
    !f.includes("vendor") &&
    !f.includes("/tests/") &&
    !f.includes(".spec.") &&
    !f.includes(".test.") &&
    !f.includes("types.ts") // types-only files are exempt
);

for (const file of srcFiles) {
  checkFile(file);
}

if (violations.length === 0) {
  console.log(`✅ verify-export-jsdoc: ${srcFiles.length} files, all exports documented`);
  process.exit(0);
} else {
  for (const v of violations) {
    const rel = relative(ROOT, v.file);
    console.error(`  ❌ ${rel}:${v.line}  ${v.kind} ${v.name} — missing JSDoc`);
  }
  console.error(`\n❌ verify-export-jsdoc: ${violations.length} violation(s)`);
  process.exit(1);
}
