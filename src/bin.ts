#!/usr/bin/env node
/**
 * Executable wrapper. Kept separate from `cli.ts` so tests can import the CLI
 * without starting a run.
 */

import { main } from "./cli.js";

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
