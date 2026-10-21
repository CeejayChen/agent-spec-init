#!/usr/bin/env tsx
/**
 * run-gates — documentation gate orchestrator
 *
 * Runs the verification gates in parallel, honouring `needs` and `after`
 * ordering, then prints one summary line per gate.
 *
 * Usage:
 *   tsx scripts/run-gates.ts <mode>
 *
 * Modes:
 *   doc-sync    every documentation gate
 *   doc-quick   gates that do not parse source code
 *   check-all   every gate
 *
 * To add a gate, append it to `GATES` below and add its script.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { availableParallelism } from "node:os";
import { dirname, resolve } from "node:path";

/** One verification gate. */
interface Gate {
  id: string;
  label: string;
  /** Script path relative to the repository root. */
  script: string;
  /** Extra arguments passed to the script. */
  args?: string[];
  /** Hard dependency: the gate runs only when this gate passed. */
  needs?: string[];
  /** Soft ordering: the gate starts only after this gate settled. */
  after?: string[];
  /** Included in `doc-quick`. */
  quick?: boolean;
}

type Mode = "doc-sync" | "doc-quick" | "check-all";

/** Every registered gate. */
const GATES: Gate[] = [
  {
    id: "verify-agent-note-format",
    label: "Agent Note format",
    script: "scripts/verify-agent-note-format.ts",
    quick: true,
  },
  {
    id: "verify-agent-note-classification",
    label: "Agent Note classification",
    script: "scripts/verify-agent-note-classification.ts",
    quick: true,
  },
  {
    id: "verify-md-links",
    label: "Markdown links",
    script: "scripts/verify-md-links.ts",
    quick: true,
  },
  {
    id: "verify-md-wrap",
    label: "Markdown wrap",
    script: "scripts/verify-md-wrap.ts",
    quick: true,
  },
  {
    id: "verify-doc-budgets",
    label: "Document budgets",
    script: "scripts/verify-doc-budgets.ts",
    quick: true,
  },
  {
    id: "verify-export-jsdoc",
    label: "Export JSDoc coverage",
    script: "scripts/verify-export-jsdoc.ts",
  },
];

/** Return the gates selected by a mode. */
function gatesForMode(mode: Mode): Gate[] {
  switch (mode) {
    case "doc-sync":
    case "check-all":
      return GATES;
    case "doc-quick":
      return GATES.filter((gate) => gate.quick);
  }
}

/**
 * Resolve the project's own tsx executable.
 *
 * Gates are TypeScript, so the runner starts each one through tsx. Resolving
 * the local package keeps the command independent of PATH and of the shell,
 * which matters on Windows and in minimal containers. When tsx is only
 * installed globally, the runner falls back to the PATH lookup.
 */
function resolveTsx(): { command: string; args: string[] } {
  try {
    const require = createRequire(import.meta.url);
    const manifestPath = require.resolve("tsx/package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
      bin?: string | Record<string, string>;
    };
    const bin =
      typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.tsx;
    if (typeof bin === "string") {
      return {
        command: process.execPath,
        args: [resolve(dirname(manifestPath), bin)],
      };
    }
  } catch {
    // tsx is not installed locally; the PATH fallback reports its own error.
  }
  return { command: "tsx", args: [] };
}

/** Start one gate and capture its combined output. */
function runGate(gate: Gate): Promise<{ exitCode: number; output: string }> {
  const runner = resolveTsx();

  return new Promise((done) => {
    const proc: ChildProcess = spawn(
      runner.command,
      [...runner.args, gate.script, ...(gate.args ?? [])],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let output = "";
    proc.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });
    proc.stderr?.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.on("error", (err) => {
      done({ exitCode: 1, output: `${output}${String(err)}` });
    });
    proc.on("close", (code) => {
      done({ exitCode: code ?? 1, output });
    });
  });
}

/** Reject duplicate ids and dependency cycles before any gate starts. */
function validateGateGraph(gates: Gate[]): void {
  const ids = new Set(gates.map((gate) => gate.id));
  const seen = new Set<string>();

  for (const gate of gates) {
    if (seen.has(gate.id)) {
      throw new Error(`Duplicate gate id: ${gate.id}`);
    }
    seen.add(gate.id);
    for (const dependency of [...(gate.needs ?? []), ...(gate.after ?? [])]) {
      if (!ids.has(dependency)) {
        throw new Error(`Gate "${gate.id}" depends on unknown gate "${dependency}"`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`Cycle detected involving gate: ${id}`);
    }
    visiting.add(id);
    const gate = gates.find((candidate) => candidate.id === id);
    for (const dependency of [...(gate?.needs ?? []), ...(gate?.after ?? [])]) {
      visit(dependency);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const gate of gates) visit(gate.id);
}

type GateState = "pending" | "running" | "passed" | "failed" | "skipped";

/** Execute the selected gates and exit non-zero when any gate fails. */
async function runGates(mode: Mode): Promise<void> {
  const gates = gatesForMode(mode);
  if (gates.length === 0) {
    console.log(`No gates registered for mode: ${mode}`);
    return;
  }

  validateGateGraph(gates);

  interface GateRun {
    gate: Gate;
    state: GateState;
  }
  const runs = new Map<string, GateRun>();
  for (const gate of gates) runs.set(gate.id, { gate, state: "pending" });

  const maxActive = Math.min(availableParallelism(), 4);
  const running = new Set<string>();
  let active = 0;

  console.log(`\n🚀 Running ${gates.length} gates (mode: ${mode}, concurrency: ${maxActive})\n`);

  const settled = (gate: Gate): boolean =>
    [...(gate.needs ?? []), ...(gate.after ?? [])].every((dependency) => {
      const state = runs.get(dependency)?.state;
      return state === "passed" || state === "failed" || state === "skipped";
    });

  const needsPassed = (gate: Gate): boolean =>
    (gate.needs ?? []).every((dependency) => runs.get(dependency)?.state === "passed");

  const pickNext = (): Gate | null => {
    for (const run of runs.values()) {
      if (run.state !== "pending" || running.has(run.gate.id) || !settled(run.gate)) {
        continue;
      }
      if (!needsPassed(run.gate)) {
        run.state = "skipped";
        console.log(`  ⏭️  ${run.gate.label} — skipped (dependency failed)`);
        continue;
      }
      return run.gate;
    }
    return null;
  };

  const done = (): boolean =>
    [...runs.values()].every(
      (run) => run.state === "passed" || run.state === "failed" || run.state === "skipped",
    );

  while (!done()) {
    while (active < maxActive) {
      const next = pickNext();
      if (next === null) break;

      active += 1;
      running.add(next.id);
      const run = runs.get(next.id)!;
      run.state = "running";
      const start = Date.now();
      console.log(`  ▶️  ${next.label}`);

      runGate(next).then(({ exitCode, output }) => {
        const duration = Date.now() - start;
        run.state = exitCode === 0 ? "passed" : "failed";
        active -= 1;
        running.delete(next.id);

        console.log(`  ${exitCode === 0 ? "✅" : "❌"} ${next.label} (${duration}ms)`);
        if (exitCode !== 0) {
          const lines = output.trim().split("\n");
          for (const line of lines.slice(0, 10)) console.error(`     ${line}`);
          if (lines.length > 10) {
            console.error(`     ... (${lines.length - 10} more lines)`);
          }
        }
      });
    }

    await new Promise((doneWaiting) => setTimeout(doneWaiting, 50));
  }

  console.log(`\n${"─".repeat(60)}`);
  const states = [...runs.values()];
  const passed = states.filter((run) => run.state === "passed").length;
  const failed = states.filter((run) => run.state === "failed").length;
  const skipped = states.filter((run) => run.state === "skipped").length;

  if (failed === 0) {
    console.log(`\n✅ All ${passed} gate(s) passed${skipped > 0 ? ` (${skipped} skipped)` : ""}`);
    return;
  }
  console.log(`\n❌ ${failed} gate(s) failed, ${passed} passed${skipped > 0 ? `, ${skipped} skipped` : ""}`);
  process.exitCode = 1;
}

const mode = process.argv[2] as Mode | undefined;
if (!mode || !["doc-sync", "doc-quick", "check-all"].includes(mode)) {
  console.error("Usage: tsx scripts/run-gates.ts <doc-sync|doc-quick|check-all>");
  process.exit(1);
} else {
  runGates(mode).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
