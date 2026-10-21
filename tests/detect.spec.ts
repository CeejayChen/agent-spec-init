/**
 * Detection: manifests, lockfiles, stacks, and existing instruction surfaces.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  detectPackageManager,
  detectProject,
  detectTemplate,
  emptyFacts,
} from "../src/detect.js";
import { removeDir, tempDir, writeFile } from "./helpers.js";

describe("detectProject", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(() => {
    removeDir(dir);
  });

  it("detects a Node repository from package.json", () => {
    writeFile(dir, "package.json", JSON.stringify({ name: "api-service" }));

    const facts = detectProject(dir);

    expect(facts.template).toBe("node");
    expect(facts.projectName).toBe("api-service");
    expect(facts.hasPackageJson).toBe(true);
  });

  it("reads the package manager from the lockfile", () => {
    writeFile(dir, "package.json", JSON.stringify({ name: "api-service" }));
    writeFile(dir, "pnpm-lock.yaml", "lockfileVersion: '9.0'\n");

    const { packageManager, source } = detectPackageManager(dir);

    expect(packageManager).toBe("pnpm");
    expect(source).toBe("lockfile");
  });

  it("falls back to the manifest packageManager field", () => {
    writeFile(dir, "package.json", JSON.stringify({ name: "x", packageManager: "yarn@4.1.0" }));

    expect(detectPackageManager(dir)).toEqual({ packageManager: "yarn", source: "manifest" });
  });

  it("defaults to npm without evidence", () => {
    expect(detectPackageManager(dir)).toEqual({ packageManager: "npm", source: "default" });
  });

  it("detects a Python repository from pyproject.toml", () => {
    writeFile(dir, "pyproject.toml", '[project]\nname = "sample-service"\nversion = "0.1.0"\n');
    writeFile(dir, "src/sample/__init__.py", '"""Sample."""\n');
    writeFile(dir, "tests/test_sample.py", "def test_ok():\n    assert True\n");

    const facts = detectProject(dir);

    expect(facts.template).toBe("python");
    expect(facts.projectName).toBe("sample-service");
    expect(facts.hasPytest).toBe(true);
    expect(facts.hasTestsDir).toBe(true);
  });

  it("returns the generic profile for an empty directory", () => {
    expect(detectTemplate(dir)).toBe("generic");
    expect(detectProject(dir).template).toBe("generic");
  });

  it("derives the name from the directory when no manifest carries one", () => {
    expect(detectProject(dir).projectName).toBe(emptyFacts(dir).projectName);
  });

  it("detects workspaces as a monorepo", () => {
    writeFile(dir, "package.json", JSON.stringify({ name: "root", workspaces: ["packages/*"] }));
    writeFile(dir, "packages/core/package.json", JSON.stringify({ name: "@root/core" }));

    expect(detectProject(dir).monorepo).toBe(true);
  });

  it("records existing instruction surfaces and CI", () => {
    writeFile(dir, "AGENTS.md", "# AGENTS\n");
    writeFile(dir, "CLAUDE.md", "# CLAUDE\n");
    writeFile(dir, ".github/workflows/ci.yml", "name: ci\n");

    const facts = detectProject(dir);

    expect(facts.instructionFiles).toEqual(expect.arrayContaining(["AGENTS.md", "CLAUDE.md"]));
    expect(facts.hasCi).toBe(true);
  });

  it("detects bilingual documentation", () => {
    writeFile(dir, "README.md", "# 项目\n");
    writeFile(dir, "README.zh.md", "# 项目\n");

    expect(detectProject(dir).bilingualDocs).toBe(true);
  });
});
