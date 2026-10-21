# AGENTS.md — The documentation standard

This file defines document structure, the home of each fact, the writing rules, and the word budgets. Root [AGENTS.md](../AGENTS.md) links here; the detail lives in this file.

## Document structure

Classify every document as a tutorial or a reference. A tutorial walks a reader to an outcome; a reference defines a scope and states current behavior. Author in this order: locate the document in the tree, set its permitted detail, choose tutorial or reference, order a tutorial by prerequisite, move descendant-owned detail down, and replace lower-level explanations with links.

## One home per fact

Each fact has one home: the document whose job it is. Everywhere else links there.

| Tier | Job | Does not belong there |
|---|---|---|
| Root `AGENTS.md` | Standing orders an agent needs in every session | Stories, worked examples, situational procedures, restated detail |
| Subtree `AGENTS.md` | Rules specific to that subtree | Repo-wide rules the root file already carries |
| `architecture.md` | Composition, module responsibilities, extension points | Type definitions, per-module detail, decision rationale |
| [Agent Notes](../.agents/notes/README.md) | Decisions: the why, the rejected alternatives, the consequences | Migration plans and task checklists once the decision shipped |
| [Postmortems](postmortem/) | Incident stories and causal chains | Standing rules |
| [Cookbook](cookbook/) | Step-by-step how-tos with numbered verification steps | Design rationale; link the Agent Note instead |
| Package README | The consumer contract: configuration, semantics, limitations, extension points | Comment restatement, other packages' concerns |
| `development.md` | Setup, daily workflow, CI summary | Version rationale, check lists that drift from scripts |
| Skills (`.agents/skills/`) | Reusable workflows and review standards | Product or runtime contracts |

Placement: bugs → postmortems; rationale → Agent Notes; procedures → cookbooks; package contracts → READMEs; standing orders → root `AGENTS.md` with a link to the rationale.

## Writing rules

- **Document current state, not change history.** Name the live mechanism. Change stories belong in commits, pull requests, Agent Notes, and postmortems.
- **One physical line per paragraph.** Use editor soft-wrap. Code blocks, tables, and lists keep their formatting.
- **Comments state complete contracts.** Keep behavior, failure, timing, ownership, and consequence; delete narration, walkthroughs, and review analysis.
- **Write directly.** Name the actor and the fact, and prefer the concrete check or operation over a metaphor.
- **Every command is runnable.** A command in a document is one that was run, or it is labelled unverified.

## Word budgets

`scripts/doc-budgets.manifest.json` sets standing-document ceilings. {{DOC_GATE}} rejects a document above its ceiling and a listed file that is missing.

When a budget goes red:

1. **Relocate** content that belongs in another tier and leave a one-line link.
2. **Condense** content that belongs here but can be shorter.
3. **Raise** the ceiling only when the words need the space, and justify the manifest change in the same change.

## The slop checklist

- The same rule stated in more than one home.
- Narrated history: "previously", "now", "no longer", pull request numbers.
- Implementation-status annotations in prose or diagrams.
- Hand-restated catalogs or comment blocks when source or a generator is authoritative.
- Reasoning transcripts: step-by-step narration and test walkthroughs.
- Paragraph walls carrying several rules and parenthetical asides.
- Emphasis inflation: bold and capital letters everywhere.

## Cross-references

Link repository references with relative Markdown paths, never bare file names. A broken target or a dead anchor is a defect: {{LINK_GATE}} reports them.
