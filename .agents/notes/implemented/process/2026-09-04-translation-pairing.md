# Agent Note: Translation pairing for bilingual docs

Status: implemented

## Problem

Chinese versions of the English docs can drift silently: nothing records when the two were last confirmed in sync, so a reviewer cannot tell whether a `.zh.md` still matches its `.md` original.

## Decision

Manage bilingual docs as triplets: `<name>.md` (English), `<name>.zh.md` (Chinese), and `<name>.i18n.yaml` (a sidecar recording the git blob hash of each version at last confirmed sync). A new gate, `scripts/verify-translation-pairing.ts`, compares current hashes against the recorded ones and fails when either side changed; `--write` updates the sidecar to confirm sync. The gate is registered in `run-gates.ts` and exposed as `npm run verify-translation-pairing`.

The gate's Markdown anchor slugger now uses Unicode letter/number classes (`\p{L}\p{N}`) so Chinese headings resolve; the old `\w`-based slugger stripped CJK characters and rejected valid Chinese anchors.

## Alternatives considered

- **No sidecar, just `.zh.md` counterparts:** cheapest, but gives no drift signal; a stale translation passes review unnoticed.
- **Re-translate-on-CI:** requires an LLM in CI and still needs human confirmation; the hash sidecar keeps confirmation cheap and auditable.
- **Git hooks instead of a gate:** hooks are bypassable and per-machine; a repo gate covers every contributor.

## Consequences

- Eight existing translation pairs now carry `.i18n.yaml` sidecars; `npm run test:docs` verifies them.
- The bilingual convention is documented in `docs/i18n/README.md`.
- Changing either side of a pair without `--write` fails CI until the translation is confirmed.
