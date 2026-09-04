#!/usr/bin/env tsx
/**
 * verify-agent-note-classification
 *
 * Validates that every Agent Note sits in a recognized lifecycle/class folder
 * and that the closed classification set is respected.
 *
 * Usage: tsx scripts/verify-agent-note-classification.ts [notes-root]
 */

import { resolve } from "node:path";
import { walkAgentNoteTree } from "./agent-note-tree.js";

const DEFAULT_NOTES_ROOT = resolve(".agents", "notes");
const notesRoot = process.argv[2]
  ? resolve(process.argv[2])
  : DEFAULT_NOTES_ROOT;

const { notes, errors } = walkAgentNoteTree(notesRoot);

if (errors.length === 0) {
  console.log(`✅ verify-agent-note-classification: ${notes.length} notes, all classified correctly`);
  process.exit(0);
} else {
  for (const err of errors) {
    console.error(`  ❌ ${err}`);
  }
  console.error(`\n❌ verify-agent-note-classification: ${errors.length} error(s)`);
  process.exit(1);
}
