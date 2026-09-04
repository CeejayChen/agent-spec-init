#!/usr/bin/env tsx
/**
 * verify-agent-note-format
 *
 * Validates the format of every Agent Note under .agents/notes/:
 * - Header block (lines 1-4): title, blank, Status:, blank
 * - Status line matches lifecycle (proposed/implemented/rejected)
 * - First H2 must be ## Problem
 * - Required sections per lifecycle
 * - No banned headings in implemented/
 * - ## Alternatives considered is mandatory
 *
 * Usage: tsx scripts/verify-agent-note-format.ts [notes-root]
 */

import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  walkAgentNoteTree,
  type NoteEntry,
  type Lifecycle,
} from "./agent-note-tree.js";

const DEFAULT_NOTES_ROOT = resolve(".agents", "notes");

/** Required H2 sections per lifecycle (excluding ## Problem which is always required first). */
const REQUIRED_SECTIONS: Record<Lifecycle, string[]> = {
  proposed: ["## Proposal", "## Alternatives considered", "## Acceptance criteria", "## Risks"],
  implemented: ["## Decision", "## Alternatives considered", "## Consequences"],
  rejected: ["## Proposal"],
};

/** Headings banned in implemented/ notes (proposal-era spec-speak). */
const BANNED_IN_IMPLEMENTED = [
  "## Proposal",
  "## Plan",
  "## Migration plan",
  "## Acceptance criteria",
];

/** Status line patterns per lifecycle. */
const STATUS_PATTERNS: Record<Lifecycle, RegExp> = {
  proposed: /^Status: proposed$/,
  implemented: /^Status: implemented$/,
  rejected: /^Status: rejected — .+$/,
};

function fail(msg: string): void {
  errors.push(msg);
}

const errors: string[] = [];

function verifyNote(note: NoteEntry): void {
  let content: string;
  try {
    content = readFileSync(note.path, "utf-8");
  } catch {
    fail(`Cannot read: ${note.relPath}`);
    return;
  }

  const lines = content.split("\n");

  // --- Header block (lines 0-3, i.e. lines 1-4 in 1-based) ---
  if (lines.length < 4) {
    fail(`${note.relPath}: file too short (need at least 4 lines for header)`);
    return;
  }

  // Line 1: # Agent Note: <title>
  if (!/^# Agent Note: \S/.test(lines[0])) {
    fail(`${note.relPath}: line 1 must be "# Agent Note: <title>"`);
  }

  // Line 2: blank
  if (lines[1].trim() !== "") {
    fail(`${note.relPath}: line 2 must be blank`);
  }

  // Line 3: Status line
  const statusPattern = STATUS_PATTERNS[note.lifecycle];
  if (!statusPattern.test(lines[2])) {
    fail(
      `${note.relPath}: line 3 Status: line does not match expected pattern for ${note.lifecycle}`
    );
  }

  // Line 4: blank
  if (lines[3].trim() !== "") {
    fail(`${note.relPath}: line 4 must be blank`);
  }

  // --- Exactly one Status: line ---
  const statusLines = lines.filter((l) => /^Status:/.test(l));
  if (statusLines.length !== 1) {
    fail(`${note.relPath}: expected exactly 1 Status: line, found ${statusLines.length}`);
  }

  // --- Extract H2 sections (skip fenced code blocks) ---
  const h2s: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^## /.test(line)) {
      h2s.push(line.trim());
    }
  }

  // --- First H2 must be ## Problem ---
  if (h2s.length === 0) {
    fail(`${note.relPath}: no H2 sections found`);
    return;
  }
  if (h2s[0] !== "## Problem") {
    fail(`${note.relPath}: first H2 must be "## Problem", found "${h2s[0]}"`);
  }

  // --- Required sections ---
  const required = REQUIRED_SECTIONS[note.lifecycle];
  for (const section of required) {
    // Special case: ## Alternatives considered can be replaced by the grandfather comment
    if (section === "## Alternatives considered") {
      const hasSection = h2s.includes(section);
      const hasGrandfather = content.includes(
        "<!-- agent-note-format: alternatives-not-recorded (pre-format Agent Note) -->"
      );
      if (!hasSection && !hasGrandfather) {
        fail(`${note.relPath}: missing required section "${section}"`);
      }
      if (hasSection && hasGrandfather) {
        fail(
          `${note.relPath}: cannot have both "## Alternatives considered" section and grandfather comment`
        );
      }
      continue;
    }
    if (!h2s.includes(section)) {
      fail(`${note.relPath}: missing required section "${section}" for ${note.lifecycle}`);
    }
  }

  // --- Banned headings in implemented/ ---
  if (note.lifecycle === "implemented") {
    for (const banned of BANNED_IN_IMPLEMENTED) {
      if (h2s.includes(banned)) {
        fail(
          `${note.relPath}: banned heading "${banned}" in implemented note (proposal-era spec-speak)`
        );
      }
    }
  }
}

// --- Main ---
const notesRoot = process.argv[2]
  ? resolve(process.argv[2])
  : DEFAULT_NOTES_ROOT;

const { notes, errors: walkErrors } = walkAgentNoteTree(notesRoot);
errors.push(...walkErrors);

for (const note of notes) {
  verifyNote(note);
}

if (errors.length === 0) {
  console.log(`✅ verify-agent-note-format: ${notes.length} notes passed`);
  process.exit(0);
} else {
  for (const err of errors) {
    console.error(`  ❌ ${err}`);
  }
  console.error(`\n❌ verify-agent-note-format: ${errors.length} error(s)`);
  process.exit(1);
}
