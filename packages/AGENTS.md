# AGENTS.md — Packages

These package-specific rules supplement the repo-wide [conventions](../AGENTS.md#conventions).

- **Plugin exports:** service packages default-export their service class; function plugins named-export `name` / `inject` / `Config` / `apply` and have no default export.
- **Optional services use explicit lookup.** Reserve declared injections for required dependencies.
- **Product-visible plugins require a non-unit composition test.** Hand-built plugin suites are insufficient. Boot test-only config through the loader and process; mock only external services or nondeterministic inputs and assert model-visible, durable, or user-visible output.
- **Represent one asynchronous operation with one lifecycle controller or transaction.** Separate readiness, cancellation, disposal, or sentinel state requires an independent owner.
- **Design service definitions for all current consumers.** Keep tool-schema, loader, UI, transport, and provider-specific behavior in the consumer or provider; do not let one consumer dictate the service contract.
- **Require a current owner and need.** Tie each abstraction, state machine, option, defensive copy, and compatibility path to a current contract or production consumer.
- **Require evidence for public choices.** Configurability does not justify an unsupported default, public operation set, format, or imported external concept.
- **Write model-facing contracts from the model's perspective.** Prompts, tool schemas, results, and diagnostics contain only task-relevant concepts.
- **Enforce a decision in the operation that makes it.** Schema omission, prompt filtering, facades, wrappers, and listener order are not enforcement when callers can bypass them.
- **Publish state only at its commit point.** Emit notifications and update derived state only after the operation succeeds.
- **Apply bounds to the complete result.** Enforce byte, token, item, and time limits where the complete value is known.
- **Registry contributions prove disposal.** Dispose the fiber and observe removal.

Naming rules:

- `src/types.ts` contains only types — no runtime code.
- Tests live at package level under `tests/`, not `src/__tests__/`.
- Update package README and JSDoc contracts in the same commit as behavior.
