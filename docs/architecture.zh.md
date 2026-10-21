# 架构

agent-spec-init 是一个脚手架：它读取目标仓库、规划一组文件，并把 AI agent 开发规范体系写入其中。改动探测、栈配置、规划器或模板之前，先读本文。

## 模块划分

| 模块 | 职责 |
|---|---|
| `src/cli.ts` | 参数解析、退出码、后置动作（`--install`、`--git`）。 |
| `src/options.ts` | 校验参数，用探测结果补齐默认值，并在交互模式下提问。 |
| `src/detect.ts` | 读取 manifest、锁文件、workspace 与既有指令文件，推断技术栈与项目事实。 |
| `src/profiles.ts` | 各栈的配置：命令、约定、目录布局、验证措辞与门禁文件清单。 |
| `src/plan.ts` | 生成计划：渲染后的核心文档、Notes 目录标记、门禁文件、字数预算清单、package.json 合并。 |
| `src/render.ts` | 模板加载与占位符替换；无法解析时直接报错。 |
| `src/apply.ts` | 落盘、合并 manifest，并把文件归为新建、保留、未变。 |
| `src/report.ts` | 人类可读摘要与 JSON 报告，含 `needsAttention` 与下一步。 |
| `src/templates/core/` | 与栈无关的正文：指令、文档、Notes、Skills。 |
| `src/templates/node/` | 由 `tsx` 运行的 TypeScript 门禁，以及 scripts 的 tsconfig。 |
| `src/templates/python/` | 仅用标准库的门禁脚本。 |
| `scripts/` | 本仓库自己的门禁，包括 `verify-templates`。 |

## 数据流

`main` 先用 `resolveOptions`（探测加可选交互）解析参数，再用 `buildPlan` 生成 `ScaffoldPlan`，随后用 `applyPlan` 落盘或用 `previewPlan` 预览。`--dry-run` 只替换最后一步，因此预览不会与真实运行漂移。报告只读取计划与落盘结果，从不重新推导文件内容。

## 扩展点

新增一种技术栈，等于在 `src/profiles.ts` 增加一个 `StackProfile`，并在 `src/templates/<id>/` 下提供模板包。把该配置加入 `PROFILES` 与 `PROFILE_LIST`，列出它的门禁文件，并扩展 `TemplateId`。`verify-templates` 会渲染所有配置，并拒绝没有任何配置使用的模板。

新增一篇常驻文档，等于在 `src/templates/core/` 增加模板、在 `CORE_DOCUMENTS` 或 `MONOREPO_DOCUMENTS` 注册，并在 `DOCUMENT_BUDGETS` 设定上限。生成的 `doc-budgets.manifest.json` 由计划实际产出的文件推导。

## 设计决策

架构决策记录在 [Agent Notes](../.agents/notes/README.md) 的 `architecture` 分类下。栈配置的拆分与被否方案记录在[脚手架重构笔记](../.agents/notes/implemented/process/2026-10-21-stack-profiles-cli.md)。
