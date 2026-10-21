/**
 * Template rendering: explicit variables, loud failures, normalized output.
 */

import { describe, expect, it } from "vitest";
import { normalizeText, render, renderTemplate } from "../src/render.js";

describe("render", () => {
  it("substitutes placeholders", () => {
    expect(render("Hello {{NAME}}", { NAME: "world" })).toBe("Hello world\n");
  });

  it("fails when a placeholder has no value", () => {
    expect(() => render("Hello {{NAME}}", {})).toThrow(/no value for template variable \{\{NAME\}\}/);
  });

  it("names the template in the error", () => {
    expect(() => render("{{MISSING}}", {}, "docs/example.md")).toThrow(/docs\/example\.md/);
  });

  it("rejects values that reintroduce a placeholder", () => {
    expect(() => render("{{BLOCK}}", { BLOCK: "still {{HERE}}" })).toThrow(/placeholder/);
  });

  it("normalizes CRLF and the trailing newline", () => {
    expect(render("a\r\nb\r\n\r\n", {})).toBe("a\nb\n");
  });

  it("reports a missing bundled template", () => {
    expect(() => renderTemplate("core/does-not-exist.md", {})).toThrow(/Missing bundled template/);
  });
});

describe("normalizeText", () => {
  it("leaves exactly one trailing newline", () => {
    expect(normalizeText("text")).toBe("text\n");
    expect(normalizeText("text\n\n\n")).toBe("text\n");
  });
});
