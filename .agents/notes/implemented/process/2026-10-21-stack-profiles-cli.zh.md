# Agent Note: 栈配置与 create 式 CLI

Status: implemented

## Problem

第一个版本把同一套 TypeScript 风格的规范写进所有仓库：总是创建 `package.json`，总是生成 `tsx` 门禁，在 Python 或 Go 项目里也描述 ESM 与严格 TypeScript。它没有 `--dry-run`，`--skip-install` 从未生效，包管理器靠探测已安装的命令而不是读锁文件，跳过文件时也不区分"内容相同"和"内容不同"。因此它无法诚实地宣称适用于"任意使用 AI 开发的项目"。

## Decision

把脚手架拆成三层。探测层（[src/detect.ts](../../../../src/detect.ts)）把目标目录变成事实：从 manifest 与源码分布判断技术栈，从锁文件和 `packageManager` 字段判断包管理器，从 workspace 配置判断 monorepo，并记录既有指令文件、CI 与测试。栈配置（[src/profiles.ts](../../../../src/profiles.ts)）把这些事实变成按栈生成的正文块与门禁清单。规划器（[src/plan.ts](../../../../src/plan.ts)）把它们与 `src/templates/core/` 下与栈无关的模板组合成纯数据的 `ScaffoldPlan`；只有 [src/apply.ts](../../../../src/apply.ts) 落盘。

内置三种配置：`node`（由 `tsx` 运行的 TypeScript 门禁，并合并 `package.json` 的 script 与 devDependency）、`python`（一个纯标准库的 `scripts/doc_gates.py`，包含同样的六项检查）、`generic`（规范核心加人工检查清单，不生成脚本）。`--template auto` 由探测选择；`generic` 绝不声称拥有它无法运行的门禁。

CLI 增加了位置参数目标目录、`--template`、`--dry-run`、`--json`、`--git`、`--install`、`--monorepo`、`--no-skills`，以及由探测驱动的默认值。内容不同的既有文件报告为 `kept`；非法 `package.json` 直接让运行失败，而不是被覆盖。`--dry-run` 与真实运行共用同一份计划，预览不会漂移。

## Alternatives considered

**只保留一份 TypeScript 模板。** 代码更少，但会把每个非 Node 仓库描述错，并教未来的 agent 会话忽略这些指令。规范体系如果谎报技术栈，就在它唯一的职责上失败了。

**把每种栈的门禁都写进每个仓库。** 把 TypeScript 门禁复制进 Go 项目会留下没人能运行的脚本；这种失败会训练人们忽略红色输出。门禁只在工具链能执行时生成，`generic` 配置则明确说明验证是人工的。

**让 agent 在运行时适配，而不做 CLI。** `spec-init` skill 已经承担语义适配，但没有确定性生成器就没有可复现的基线、没有 `--dry-run`，脚手架本身也没有门禁覆盖。CLI 产出基线，skill 负责适配。

**照搬 deepseek-harness 的完整门禁集。** 那些门禁大多编码了该代码库自身的规则（插件导出、会话日志重建、能力缝）。复制到任意仓库只会产生噪音。保留的六项检查，其输入在任何带 Markdown 与笔记的仓库里都存在。

**使用 Handlebars 之类的模板引擎。** 需要的是条件化正文，而不是模板里的条件语法。在 TypeScript 中生成正文块，能保证每条命令都来自探测到的事实；而未知模板变量仍然会硬失败。

## Consequences

- 新增一种栈等于一个配置加一个模板包；`npm run verify-templates` 会拒绝没有配置使用的模板包，并在发布前渲染每种配置，检查占位符、结尾换行与字数预算。
- 测试现在会真实生成 Node 与 Python 项目并运行生成的门禁，还包括让门禁故意失败的负向控制。
- 仓库自身的指令与文档被改写为描述本工具；此前的文件是未经编辑的模板。
- Windows 与 Python 仍是一等公民：生成的 Python 运行器只用标准库，Node 运行器解析本地 `tsx`，不依赖 shell 的 PATH 查找。
- 字数预算是按配置生成的：产出的 `doc-budgets.manifest.json` 只列出本次真正写入的文件。
