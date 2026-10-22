/**
 * Shared file discovery: gates filter by path segment, so collected paths must
 * use one separator on every platform.
 */

import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { collectFiles } from "../src/templates/node/scripts/repo-files.js";
import { removeDir, tempDir, writeFile } from "./helpers.js";

describe("collectFiles", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(() => {
    removeDir(dir);
  });

  it("returns forward-slash paths on every platform", () => {
    writeFile(dir, "src/a.ts", "export const a = 1;\n");

    const files = collectFiles(dir, [".ts"]);

    expect(files).toHaveLength(1);
    expect(files[0]).toBe(join(dir, "src", "a.ts").replace(/\\/g, "/"));
    expect(files[0]).not.toContain("\\");
  });

  it("skips excluded directories and respects extensions", () => {
    writeFile(dir, "docs/readme.md", "# readme\n");
    writeFile(dir, "dist/out.js", "");
    writeFile(dir, "node_modules/pkg/index.ts", "");

    const markdown = collectFiles(dir, [".md"]);
    expect(markdown).toHaveLength(1);
    expect(markdown[0]?.endsWith("/docs/readme.md")).toBe(true);

    expect(collectFiles(dir, [".ts"])).toHaveLength(0);
  });
});
