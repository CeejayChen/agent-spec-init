# AGENTS.md

{{PROJECT_NAME}} uses an AI agent development specification system so that human direction and agent changes stay reviewable. Read [docs/architecture.md](docs/architecture.md) before changing source code.

## Repository layout

{{LAYOUT}}

## Commands

{{COMMANDS}}

## Conventions

{{CONVENTIONS}}

## Defensive patterns

Read [docs/defensive-patterns.md](docs/defensive-patterns.md) before lifecycle, concurrency, subprocess, or teardown work.

## Documentation

{{DOCUMENTATION_RULE}}

## Agent Notes

[Agent Notes](.agents/notes/README.md) record the why, the alternatives that lost, and the consequences of every non-trivial decision. Every non-trivial change adds or updates one in the same change ([when to write one](.agents/notes/README.md#when-to-write-one)).

## Verification

{{VERIFICATION}}

## Editing these instructions

Edit this file directly. Keep each rule self-contained and link the document that owns its detail. Condense when clarity survives.
