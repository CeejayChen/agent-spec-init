---
name: prose-standard
description: Use when writing, reviewing, restoring, trimming, or auditing prose in the repo, including deciding where documentation or comments are required across Markdown, JSDoc, code and test comments, prompts, descriptions, diagnostics, and CLI or UI strings.
---

# Prose Standard

Write enough to preserve the contract, then remove reasoning transcripts, repetition, and decoration. This skill owns editorial judgment and required prose coverage.

## Preserve the complete proposition

Before editing, identify every proposition in the passage. Preserve each relevant:

- actor and action;
- condition, timing, and ordering;
- modality such as must, may, or never;
- negative guarantee and exception;
- ownership, side effect, failure mode, and consequence.

Remove adjectives, repetition, and narration only when every factual clause survives and the result is clearer. A smaller word count alone is not an improvement.

## Required coverage by prose location

- **Public JSDoc:** document caller-visible return distinctions, throws or rejections, side effects, ownership, timing, cancellation, and durability.
- **Internal comments:** orient non-local structure and obviously complicated local structure, including invariants, race ordering, ownership, security boundaries, and surprising failure behavior. Delete control-flow narration and code restatement.
- **Module comments:** state the module's role, dependencies, responsibilities, and non-obvious architecture choices.
- **Tests:** explain only non-obvious test design — why a fixture, assertion, or indirect observation is necessary. Delete walkthroughs and inventories.
- **READMEs:** include the consumer contract: configuration, semantics, failures, limitations, and extension points. Keep durable gaps and maintainer traps.
- **Agent Notes:** retain unique rationale, mechanisms, alternatives, consequences, and named coverage gaps. Implemented Agent Notes state shipped reality in the present tense.
- **Prompts and visible strings:** treat wording as behavior. Pin stable model-visible text verbatim.

## Workflow

1. Confirm the scope, mode, and applicable `AGENTS.md` files.
2. Read the documentation standard and the owning code or document before judging a passage.
3. Inspect the requested scope, not only the largest files.
4. Classify each candidate as keep, add, trim, restore, restructure, or defer.
5. Update the owner before derivative artifacts.
6. Run the narrow relevant checks and documentation gates.
7. Report the inspected scope, clear changes, deliberate keeps, and deferred cases.
