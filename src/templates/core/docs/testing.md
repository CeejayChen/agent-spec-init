# Testing policy

How {{PROJECT_NAME}} tests, tier by tier, and the rules that keep a green suite meaningful. Commands live in root [AGENTS.md](../AGENTS.md).

## Tiers

{{TIERS}}

## Prefer the real implementation over a mock

Mock only the expensive or non-deterministic boundary (an external API, the network, the clock) and keep everything downstream real. A hand-rolled stand-in proves the bridge moves bytes, not that the shipped behavior holds.

## Verify the world, not the self-report

An end-to-end assertion re-runs the command or re-reads the file externally. A keyword probe on the agent's own output lets a failing run pass. Assert that untouched files are byte-identical, and let each test own the resources it creates.

## Test the real entry path

Exercise the path users and CI actually take — the published command, the real configuration loader — not a hand-built harness. Mock only external services and nondeterministic inputs, and assert user-visible, durable, or model-visible output.

## When a snapshot is warranted

Add a snapshot or expected-output fixture only when a model, protocol, or user-visible output has a stable representation. An expected output that is not driven by a recorded session stays with the module that owns it.

## Manual check before handing off

When no gate covers the changed surface, check it by hand: one physical line per paragraph, every relative link resolves, and each standing document stays within its ceiling in `scripts/doc-budgets.manifest.json`.
