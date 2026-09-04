# Agent Note: 双语文档的翻译配对

Status: implemented

## Problem

英文文档的中文版本可能无声地漂移：没有任何记录表明两者最后一次确认同步的时间，审查者无法判断 `.zh.md` 是否仍与 `.md` 原文一致。

## Decision

将双语文档作为三元组管理：`<name>.md`（英文）、`<name>.zh.md`（中文）和 `<name>.i18n.yaml`（记录两个版本在最后一次确认同步时的 git blob hash 的伴随文件）。新门禁 `scripts/verify-translation-pairing.ts` 将当前 hash 与记录值对比，任一侧变更即失败；`--write` 更新伴随文件以确认同步。该门禁注册在 `run-gates.ts` 中，以 `npm run verify-translation-pairing` 暴露。

门禁的 Markdown 锚点 slug 生成器现在使用 Unicode 字母/数字类（`\p{L}\p{N}`），使中文标题可以解析；旧的基于 `\w` 的生成器会剥离 CJK 字符并拒绝有效的中文锚点。

## Alternatives considered

- **无伴随文件，仅 `.zh.md` 对照版：** 成本最低，但不提供漂移信号；过时的翻译会在审查中不被察觉地通过。
- **CI 中重新翻译：** 需要在 CI 中引入 LLM，且仍需要人工确认；hash 伴随文件使确认廉价且可审计。
- **Git hooks 而非门禁：** hooks 可被绕过且依赖单机配置；仓库门禁覆盖每位贡献者。

## Consequences

- 现有八个翻译对现在都带有 `.i18n.yaml` 伴随文件；`npm run test:docs` 对其验证。
- 双语约定记录在 `docs/i18n/README.md` 中。
- 未用 `--write` 修改配对任一侧会在 CI 中失败，直到翻译被确认。
