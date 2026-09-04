#!/usr/bin/env tsx
/**
 * run-gates — Documentation gate runner / orchestrator
 *
 * Runs verification gates in parallel with dependency ordering.
 *
 * Usage:
 *   tsx scripts/run-gates.ts <mode>
 *
 * Modes:
 *   doc-sync    — all documentation gates
 *   doc-quick   — lightweight gates (no build required)
 *   check-all   — everything
 *
 * Extending: add a new gate to the `gates` array below.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { availableParallelism } from "node:os";

// --- Gate definition ---

interface Gate {
  id: string;
  label: string;
  command: string;
  args: string[];
  needs?: string[];   // hard dependencies (must pass before this starts)
  after?: string[];   // soft ordering (must settle, regardless of outcome)
  quick?: boolean;     // lightweight gate for doc-quick mode
}

type Mode = "doc-sync" | "doc-quick" | "check-all";

// --- Gate registry ---

function gatesForMode(mode: Mode): Gate[] {
  const allGates: Gate[] = [
    {
      id: "verify-agent-note-format",
      label: "Agent Note format",
      command: "tsx",
      args: ["scripts/verify-agent-note-format.ts"],
      quick: true,
    },
    {
      id: "verify-agent-note-classification",
      label: "Agent Note classification",
      command: "tsx",
      args: ["scripts/verify-agent-note-classification.ts"],
      quick: true,
    },
    {
      id: "verify-md-links",
      label: "Markdown links",
      command: "tsx",
      args: ["scripts/verify-md-links.ts"],
      quick: true,
    },
    {
      id: "verify-md-wrap",
      label: "Markdown wrap",
      command: "tsx",
      args: ["scripts/verify-md-wrap.ts"],
      quick: true,
    },
    {
      id: "verify-doc-budgets",
      label: "Document budgets",
      command: "tsx",
      args: ["scripts/verify-doc-budgets.ts"],
      quick: true,
    },
    {
      id: "verify-export-jsdoc",
      label: "Export JSDoc coverage",
      command: "tsx",
      args: ["scripts/verify-export-jsdoc.ts"],
      quick: false,
    },
  ];

  switch (mode) {
    case "doc-quick":
      return allGates.filter((g) => g.quick);
    case "doc-sync":
      return allGates;
    case "check-all":
      return allGates;
  }
}

// --- Scheduler ---

type GateState = "pending" | "running" | "passed" | "failed" | "skipped";

interface GateRun {
  gate: Gate;
  state: GateState;
  duration: number;
  output: string;
}

function validateGateGraph(gates: Gate[]): void {
  const ids = new Set(gates.map((g) => g.id));
  const seen = new Set<string>();

  for (const gate of gates) {
    if (seen.has(gate.id)) {
      throw new Error(`Duplicate gate id: ${gate.id}`);
    }
    seen.add(gate.id);

    for (const dep of [...(gate.needs ?? []), ...(gate.after ?? [])]) {
      if (!ids.has(dep)) {
        throw new Error(`Gate "${gate.id}" depends on unknown gate "${dep}"`);
      }
    }
  }

  // Cycle detection via DFS
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`Cycle detected involving gate: ${id}`);
    }
    visiting.add(id);
    const gate = gates.find((g) => g.id === id);
    if (gate) {
      for (const dep of [...(gate.needs ?? []), ...(gate.after ?? [])]) {
        dfs(dep);
      }
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const gate of gates) {
    dfs(gate.id);
  }
}

function runGate(gate: Gate): Promise<{ exitCode: number; output: string }> {
  return new Promise((resolve) => {
    const proc: ChildProcess = spawn(gate.command, gate.args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let output = "";
    proc.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });
    proc.stderr?.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      resolve({ exitCode: code ?? 1, output });
    });
  });
}

async function runGates(mode: Mode): Promise<void> {
  const gates = gatesForMode(mode);

  if (gates.length === 0) {
    console.log(`No gates registered for mode: ${mode}`);
    return;
  }

  validateGateGraph(gates);

  const runs = new Map<string, GateRun>();
  for (const gate of gates) {
    runs.set(gate.id, { gate, state: "pending", duration: 0, output: "" });
  }

  const maxActive = Math.min(availableParallelism(), 4);
  let active = 0;
  const running = new Set<string>();

  console.log(`\n🚀 Running ${gates.length} gates (mode: ${mode}, concurrency: ${maxActive})\n`);

  function allDepsSettled(gate: Gate): boolean {
    const deps = [...(gate.needs ?? []), ...(gate.after ?? [])];
    return deps.every((dep) => {
      const run = runs.get(dep);
      return run && (run.state === "passed" || run.state === "failed" || run.state === "skipped");
    });
  }

  function allDepsPassed(gate: Gate): boolean {
    const deps = gate.needs ?? [];
    return deps.every((dep) => runs.get(dep)?.state === "passed");
  }

  function pickNext(): Gate | null {
    for (const run of runs.values()) {
      if (run.state === "pending" && allDepsSettled(run.gate) && !running.has(run.gate.id)) {
        if (run.gate.needs && run.gate.needs.length > 0 && !allDepsPassed(run.gate)) {
          run.state = "skipped";
          console.log(`  ⏭️  ${run.gate.label} — skipped (dependency failed)`);
          continue;
        }
        return run.gate;
      }
    }
    return null;
  }

  function allDone(): boolean {
    return [...runs.values()].every(
      (r) => r.state === "passed" || r.state === "failed" || r.state === "skipped"
    );
  }

  while (!allDone()) {
    while (active < maxActive) {
      const next = pickNext();
      if (!next) break;

      active++;
      running.add(next.id);
      const run = runs.get(next.id)!;
      run.state = "running";
      const start = Date.now();

      console.log(`  ▶️  ${next.label}`);

      runGate(next).then(({ exitCode, output }) => {
        const duration = Date.now() - start;
        run.duration = duration;
        run.output = output;
        run.state = exitCode === 0 ? "passed" : "failed";
        active--;
        running.delete(next.id);

        const icon = exitCode === 0 ? "✅" : "❌";
        console.log(`  ${icon} ${next.label} (${duration}ms)`);

        if (exitCode !== 0) {
          const lines = output.trim().split("\n");
          for (const line of lines.slice(0, 10)) {
            console.error(`     ${line}`);
          }
          if (lines.length > 10) {
            console.error(`     ... (${lines.length - 10} more lines)`);
          }
        }
      });
    }

    // Wait a bit before polling again
    await new Promise((r) => setTimeout(r, 50));
  }

  // Summary
  console.log("\n" + "─".repeat(60));
  const passed = [...runs.values()].filter((r) => r.state === "passed").length;
  const failed = [...runs.values()].filter((r) => r.state === "failed").length;
  const skipped = [...runs.values()].filter((r) => r.state === "skipped").length;

  if (failed === 0) {
    console.log(`\n✅ All ${passed} gate(s) passed${skipped > 0 ? ` (${skipped} skipped)` : ""}`);
  } else {
    console.log(`\n❌ ${failed} gate(s) failed, ${passed} passed${skipped > 0 ? `, ${skipped} skipped` : ""}`);
    process.exit(1);
  }
}

// --- Main ---
const mode = process.argv[2] as Mode | undefined;
if (!mode || !["doc-sync", "doc-quick", "check-all"].includes(mode)) {
  console.error("Usage: tsx scripts/run-gates.ts <doc-sync|doc-quick|check-all>");
  process.exit(1);
}

runGates(mode).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
