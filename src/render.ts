/**
 * Template loading and placeholder rendering.
 *
 * A template names its inputs explicitly: an unknown `{{PLACEHOLDER}}` is a
 * defect in the template, not something to pass through, so rendering fails
 * loud instead of shipping `{{...}}` into a user's repository.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Values available to every template. */
export type TemplateVars = Record<string, string>;

const PLACEHOLDER = /\{\{([A-Z0-9_]+)\}\}/g;

/** Directory holding the bundled templates. */
export function templateRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "templates");
}

/**
 * Normalize line endings and the trailing newline.
 *
 * @param content Raw text.
 * @returns LF-separated text ending in exactly one newline.
 */
export function normalizeText(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return `${normalized.replace(/\n+$/, "")}\n`;
}

/**
 * Substitute `{{NAME}}` placeholders.
 *
 * @param template Template body.
 * @param vars Values keyed by placeholder name.
 * @param source Label used in error messages, usually the template path.
 * @returns Rendered text.
 * @throws Error when a placeholder has no value.
 */
export function render(
  template: string,
  vars: TemplateVars,
  source = "template",
): string {
  const rendered = template.replace(PLACEHOLDER, (match, key: string) => {
    const value = vars[key];
    if (value === undefined) {
      throw new Error(`${source}: no value for template variable ${match}`);
    }
    return value;
  });

  if (PLACEHOLDER.test(rendered)) {
    PLACEHOLDER.lastIndex = 0;
    throw new Error(`${source}: rendered output still contains a placeholder`);
  }
  PLACEHOLDER.lastIndex = 0;

  return normalizeText(rendered);
}

/**
 * Read a bundled template and render it.
 *
 * @param relativePath Path under the templates directory.
 * @param vars Placeholder values.
 * @returns Rendered text with normalized line endings.
 */
export function renderTemplate(relativePath: string, vars: TemplateVars): string {
  const fullPath = join(templateRoot(), relativePath);
  let content: string;
  try {
    content = readFileSync(fullPath, "utf-8");
  } catch {
    throw new Error(`Missing bundled template: ${relativePath}`);
  }
  return render(content, vars, relativePath);
}
