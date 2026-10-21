# Testing policy

How agent-spec-init tests, tier by tier, and the rules that keep a green suite meaningful. Commands live in root [AGENTS.md](../AGENTS.md).

## Tiers

- **Unit** (`npm test`): rendering, detection, planning, and applying run against temporary directories and in-memory facts. They assert file content and outcomes, never console wording.
- **Integration** (`npm test`, `tests/scaffold.spec.ts`): a real scaffold into a temporary directory, followed by the generated project's own gates run through `tsx` or Python.
- **Negative controls** (`npm test`): a wrapped paragraph and a malformed Agent Note must turn the matching gate red. A gate that cannot fail has not been shown to work.
- **Template gate** (`npm run verify-templates`): every stack profile is rendered, checked for leftover placeholders, checked against its own budget manifest, and checked for unused templates.

## Prefer the real implementation over a mock

The integration tests run the generated gate scripts instead of asserting their source text. They spawn the local `tsx` and the installed Python interpreter, so a broken import or a wrong command fails the test.

## Verify the world, not the self-report

Assertions read files from disk after the run and check process exit codes. No test claims success because a report string said so; the JSON report is tested for shape, and the filesystem is tested separately.

## Test the real entry path

`tests/cli.spec.ts` calls `main` with real argv arrays, including `--dry-run`, `--json`, and an invalid template. A hand-built options object alone would miss flag parsing and exit-code mapping.

## When a snapshot is warranted

This repository records no snapshots. Generated documents are asserted by rendering them and checking the properties that matter: no placeholders, exact trailing newlines, budgets, and resolvable links. A future output format with a stable representation gets an expected-output fixture beside its owner.

## Manual check before handing off

When a change touches docs, confirm one physical line per paragraph, resolvable relative links, and budgets within `scripts/doc-budgets.manifest.json`. When it touches bilingual docs, update the triplet and run `npm run verify-translation-pairing -- --write`.
