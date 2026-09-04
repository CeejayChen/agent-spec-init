/**
 * Copy all template files from src/templates/ to dist/templates/.
 * tsc only compiles .ts to .js, but .ts files in templates/ are templates
 * (not executable source), so they need to be copied as-is alongside .md and .json.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dirname, "..", "src", "templates");
const DIST = join(import.meta.dirname, "..", "dist", "templates");

function copyDir(src, dist) {
  if (!existsSync(dist)) {
    mkdirSync(dist, { recursive: true });
  }

  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const distPath = join(dist, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, distPath);
    } else {
      cpSync(srcPath, distPath);
    }
  }
}

copyDir(SRC, DIST);
console.log("✅ Copied all templates to dist/templates/");
