# Testing policy



How this project tests, tier by tier, and the rules that keep a green suite meaningful. Commands live in root [AGENTS.md](../AGENTS.md); linked Agent Notes carry the rationale.

## Tiers

- **Unit** (`npm run test`): tests stay with the code area they exercise. Prefer edge cases, error paths, event ordering, concurrency races, and permanent tests for contract regressions.
- **Coverage gate** (`npm run test:coverage`): per-file coverage enforcement. An uncovered line is often dead code the gate flags for deletion, not a missing test to bolt on. Line coverage is necessary, never sufficient — it proves lines ran, not that the feature works as shipped.
- **Integration / e2e**: tests against real services or composed systems. Each suite self-skips without its configuration so CI stays green for contributors without access.

## How specs execute

Forked workers run several spec files at once. Only the process is isolated: ports, predictable paths, external namespaces, and inherited children are not. Own each acquired resource through its teardown, and read a spec that passes only when it runs alone as a defect in the spec.

## Prefer the real implementation over a mock

Mock only the expensive or non-deterministic boundary (external API, network, clock); keep everything downstream real. A hand-rolled stand-in proves the bridge moves bytes, not that the shipping tool behaves as asserted.

## Verify the world, not the self-report

An e2e assertion re-runs the command or re-reads the file externally; a keyword probe on the agent's own output lets a cheating agent pass. Assert untouched files are byte-identical. e2e tests own their resources: create it in the test, dispose in `afterEach`.

## Test the real entry path

Product-visible plugins require a non-unit composition test. Hand-built plugin suites are insufficient: boot test-only config through the loader and process, mock only external services or nondeterministic inputs, and assert model-visible, durable, or user-visible output.

## When a snapshot test is required

Every non-trivial model-, protocol-, or human-visible change adds or updates a recorded-session scenario in the same PR. Expected output that is not driven by a recorded session stays with its owning module under `tests/expected/`.
