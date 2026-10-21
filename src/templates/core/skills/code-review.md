---
name: code-review
description: Use when reviewing a pull request — orients the reviewer to this codebase's standards (AGENTS.md conventions, defensive patterns, Agent Notes, quality gates) and the review-specific checks that code alone can't show.
---

# Reviewing a PR

**This skill is guidance, not a complete checklist.** Prioritize correctness, lifecycle, security, and broken required behavior over style; a short review with one substantiated blocker is better than a list of nits.

## Sources of truth

- [AGENTS.md](../../../AGENTS.md): standing repository rules.
- [docs/defensive-patterns.md](../../../docs/defensive-patterns.md): subprocess, callback, async-state, and disposal bug classes.
- [docs/AGENTS.md](../../../docs/AGENTS.md): documentation placement and prose discipline.
- [Agent Notes](../../../.agents/notes/README.md): design rationale. Treat disagreement with an Agent Note as a design discussion, not an automatic veto.

## Blocking requirements

1. **New prose receives semantic review.** Review every added or changed Markdown passage, JSDoc, comment, prompt, description, and diagnostic. Verify required coverage, accuracy, placement, and editorial quality against the owning code or behavior.
2. **Docs match the code.** Config, defaults, errors, wire fields, events, and public behavior update the package README and JSDoc in the same diff. Comments state non-obvious contracts; flag implementation narration and duplicated rationale for deletion or a link.
3. **Registrations clean up.** Verify each new registry contribution passes disposal tests.
4. **Required evidence exists.** Verify the author ran the relevant local checks for the diff and that CI covers the exhaustive matrix.

## Manual checks

- **Intent and interface contracts:** trace both sides of every changed interface. Confirm the implementation matches the PR and any Agent Note, including errors, cancellation, ownership, and disposal.
- **Lifecycle and concurrency:** for async setup, callbacks, processes, or teardown, apply defensive patterns. Check races before publication, cancellation during awaits, independent error reporting, and quiescent disposal.
- **Scope, ownership, and necessity:** map each abstraction, state machine, option, defensive copy, and compatibility path to its current contract, production consumer, and owning module. Challenge unrelated features and speculative generality.
- **Configuration and public choices:** ask what current-consumer evidence or prior art supports each default, public operation set, format, or imported external concept.
- **Enforcement:** follow every denial path to the operation that executes it; exercise direct and alternate callers that can bypass schemas, prompts, facades, wrappers, or listener ordering.

## Reporting findings

Classify each finding as:

- **Blocker** — must fix before merge.
- **Suggestion** — should fix, but not blocking.
- **Question** — needs clarification from the author.
- **Nit** — style or minor, optional.

A short review with one substantiated blocker is better than a list of nits.
