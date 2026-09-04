# 翻译配对规则



本项目采用**文档三元组（triplet）** 模式管理多语言文档：英文原文、中文译文、以及记录同步状态的 i18n sidecar 文件。

## 三元组结构

每个可翻译文档由同一目录下的三个文件组成：

```
docs/architecture.md           英文原文（权威来源之一）
docs/architecture.zh.md        中文译文（权威来源之一）
docs/architecture.i18n.yaml    同步状态记录（机器可读）
```

两种语言版本具有**平等权威性**，可从任一语言先创作或审查，再翻译另一方。

## .i18n.yaml 格式

每个 sidecar 文件记录两个版本在**最后一次确认一致时**的 git blob hash：

```yaml
architecture.md: adbfafb5642aad293eee100c36bcf88357b03997
architecture.zh.md: 9d152f8b8cefd0843d3ef7ffcb4ee6b71a616cf8
```

### 用途

1. **检测不同步**：CI 门禁对比当前文件的 blob hash 与记录的 hash，不匹配则失败。
2. **精确定位变更**：通过 blob hash 可恢复上次一致时的原文，支持最小增量翻译。
3. **可审查记录**：`--write` 更新此文件，其 diff 构成"确认一致"的可审计证据。

## 命名约定

| 类型 | 模式 | 示例 |
|---|---|---|
| 英文原文 | `<name>.md` | `architecture.md` |
| 中文译文 | `<name>.zh.md` | `architecture.zh.md` |
| 同步记录 | `<name>.i18n.yaml` | `architecture.i18n.yaml` |

## 日常工作流

### 编辑并确认同步

```bash
# 1. 编辑任一语言的文档
vim docs/architecture.md

# 2. 同步翻译（手动或由工具辅助）
vim docs/architecture.zh.md

# 3. 确认配对已同步，更新 i18n.yaml 中的 hash
npx tsx scripts/verify-translation-pairing.ts --write docs/architecture.md

# 4. 三个文件一起提交
git add docs/architecture.md docs/architecture.zh.md docs/architecture.i18n.yaml
```

### 检查同步状态

```bash
# 仅检查，不修改 i18n.yaml
npx tsx scripts/verify-translation-pairing.ts docs/architecture.md

# 检查所有三元组
npx tsx scripts/verify-translation-pairing.ts --all
```

## PR 要求

PR 必须同时包含一个三元组的三个文件，以保证完整性。单独修改英文或中文而不更新另一方，门禁将报告不同步。

## 门禁集成

翻译配对验证通过 `npm run verify-translation-pairing` 运行，集成到 `doc-sync` 门禁流程中。
