# Agent Notes



One kind of design doc lives here. An **Agent Note** records a decision or proposal that affects this codebase — the *why* and *what we gave up*, the parts code and docs can't carry. This file defines where Agent Notes live, when to write one, and [the in-file format](#the-file-format).

## Layout and naming

Every Agent Note has two axes, both encoded in its **path** — `{lifecycle}/{class}/yyyy-mm-dd-topic-title.md`:

- **Lifecycle** (the top-level folder) is the Agent Note's status:
  - **`proposed/`** — proposals reviewed before implementation; not yet built.
  - **`implemented/`** — the decision shipped. The file records what was decided and what was rejected, and is kept current with what actually shipped.
  - **`rejected/`** — the proposal was considered and declined. Keep it only while its rationale prevents a tempting mistake; otherwise delete.
- **Class** (the nested folder) is the *kind* of decision — see [Classification](#classification).

The date in the filename is when the topic was **first proposed**. Cross-references between Agent Notes use relative markdown links — never bare prose or numbers.

## Classification

Each Agent Note belongs to one path-encoded class from the closed set:

| Class | What it covers |
|---|---|
| `feature` | A new user- or model-facing capability. |
| `bug-fix` | Corrects a defect or closes a gap. |
| `simplification` | Removes code, behavior, or surface area without adding a capability. |
| `architecture` | A structural decision about the shipped source — how modules relate, what the runtime vocabulary is. |
| `process` | Tooling, policy, or workflow around the code — gates, the package manager — not runtime behavior. |
| `testing` | Test infrastructure and strategy. |

## When to write one

Every non-trivial change MUST add or update at least one Agent Note in the same PR. A change is non-trivial when it alters behavior, architecture, a contract shared across files or packages, process or tooling, testing strategy, an on-disk, wire, or configuration format, or another decision a maintainer may reasonably revisit.

Updating the Agent Note that already owns the decision satisfies the rule; do not create a duplicate. Only a purely mechanical or local edit with no change to behavior, contracts, structure, process, or rationale is exempt.

## The file format

Every active Agent Note follows one in-file format.

### The header block

The first three lines of every Agent Note are exactly:

```markdown
# Agent Note: <title>

Status: <status>
```

followed by a blank line. The `Status:` value is one of:

- `Status: proposed`
- `Status: implemented`
- `Status: rejected — <why, in one line>`

### The body skeleton

Every Agent Note opens its body with `## Problem` — the motivation, written to stand without the solution.

#### `proposed/`

```markdown
## Problem
## Proposal
…bespoke sections…
## Alternatives considered
## Acceptance criteria
## Risks
```

#### `implemented/`

```markdown
## Problem
## Decision
…bespoke sections…
## Alternatives considered
## Consequences
```

#### `rejected/`

A rejected Agent Note is the proposal, frozen. The verdict lives on the `Status:` line.

### Alternatives considered — mandatory

Every Agent Note carries an `## Alternatives considered` section: each genuine alternative and why it lost, one bold-led paragraph per alternative. A decision recorded without what it beat invites re-litigation.
