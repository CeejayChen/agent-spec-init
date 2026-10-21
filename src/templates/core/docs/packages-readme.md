# Packages

Every directory here is independently consumable: it has its own manifest, README, and tests. Root [AGENTS.md](../AGENTS.md) carries the repository-wide rules; [packages/AGENTS.md](AGENTS.md) adds the package-specific ones.

## Adding a package

1. Create the directory with its manifest and README.
2. Register it in the workspace manifest so install and test discovery see it.
3. Export the public surface through the manifest; keep internals unexported.
4. Add an Agent Note recording why a new package exists rather than a module in an existing one.

## Consumer contract

A package README states configuration, semantics, failures, limitations, and extension points. A consumer should not need to read the source to use the package correctly.
