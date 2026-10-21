# AGENTS.md — The documentation standard

This file defines document structure, Markdown tiers, writing rules, and word-count budgets.

## Document structure

Classify every in-scope document as a tutorial or reference. Tutorials follow an ordered path to an outcome. References define a lookup scope and current behavior without a teaching sequence.

Author in this order: locate the document in the tree; set its permitted detail; choose tutorial or reference; for a tutorial, order concepts by prerequisite and difficulty; relocate descendant-owned detail; replace lower-level explanations with links to their owners.

## The tier taxonomy: one home per fact

Each fact has one home: the tier whose job it is; elsewhere, link there.

| Tier | Job | Does NOT belong there |
|---|---|---|
| Root `AGENTS.md` | Standing orders: rules an agent needs in context in every session | Stories, worked examples, situational procedures, restated detail |
| Subtree `AGENTS.md` | Orders specific to that subtree | Repo-wide rules the root file already carries |
| `architecture.md` | Ordered map: composition, core packages, extension points | Type definitions, per-package detail, decision rationale, implementation-status annotations |
| [Agent Notes](../.agents/notes/README.md) | Active decision records: the why, what-was-given-up, and required verification | Migration plans, acceptance-task checklists, fixture walkthroughs, and spec-speak once the decision has shipped |
| [Postmortems](postmortem/) | Incident stories — the only tier where war-story narrative belongs | — |
| [Cookbook](cookbook/) | Step-by-step how-tos with numbered verify steps | Design rationale (→ the Agent Note each guide links) |
| Package README | The per-package contract: config, semantics, limitations, extension points | JSDoc restatement, generated-catalog restatement, other packages' concerns |
| `development.md` | Contributor setup, daily workflow, and a summary of CI | Runtime/version rationale, check-by-check lists that drift from scripts |
| Skills (`.agents/skills/`) | Reusable workflows and specialized decision standards | Product and runtime contracts (→ docs or source) |

Placement: bugs → postmortems; rationale → Agent Notes; procedures → cookbooks; type definitions → subsystems; package contracts → READMEs; standing orders → root `AGENTS.md` with a rationale link.

## Writing rules

- **Document current state, not change history.** Avoid "previously/now/no longer", PRs, commits, and stack positions in durable prose; name the live mechanism. Put change stories in commits, PRs, Agent Notes, or postmortems.
- **Every non-trivial change includes at least one Agent Note in the same PR.** Update the owning note or add one; only mechanical/local edits are exempt.
- **One physical line per paragraph**: use editor soft-wrap. Code blocks, tables, and list structure keep their formatting.
- **Comments and JSDoc state complete contracts, not reasoning transcripts.** Preserve behavior, failure, timing, ownership, and consequence. Delete narration, test walkthroughs, review analysis, and code restatement.
- Write directly: name actors and facts. Reserve `seam` for the defined capability. Name the exact check, type, API, operation, or behavior instead of metaphorical terms.

## Wordcount budgets

`scripts/doc-budgets.manifest.json` sets standing-doc ceilings; `npm run verify-doc-budgets` rejects excess or missing files.

When the gate goes red:

1. **Relocate** content that belongs in another tier; leave a one-line link if needed.
2. **Condense** content that belongs here but can be shorter.
3. **Raise** the ceiling only when the words need the space; justify the manifest diff in the PR.

## The slop checklist

Hunt these in any doc:

- The same rule stated in more than one home.
- Narrated history or war stories: "previously", "now", "no longer", "used to", PRs, or commits.
- Implementation-status annotations in prose or diagrams.
- Hand-restated catalogs, JSDoc, or inventories when source or a generator is authoritative.
- Reasoning transcripts: step-by-step narration, proof of obvious branches, test walkthroughs.
- Paragraph walls: one paragraph carrying several rules and parenthetical asides.
- Emphasis inflation: bold, CAPS, or "critically" everywhere means nothing stands out.

## Cross-reference with machine-checkable links, never free prose

Link repository references with relative Markdown paths, never bare filenames or note numbers. `npm run verify-md-links` rejects missing targets and dead anchors.
