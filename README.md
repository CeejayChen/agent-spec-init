# agent-spec-init

给任意仓库加一套 **AI agent 开发规范体系**：分层 AGENTS.md 常驻指令、Agent Notes 决策记录、可复用 Skills，以及机器可跑的门禁。做法提炼自 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 的工程实践，并按技术栈生成——Node/TypeScript 与 Python 带真实门禁，其他栈得到完整规范与人工检查清单。

> [GitHub 仓库](https://github.com/CeejayChen/agent-spec-init)

## 它解决什么问题

当 agent 真的能改文件、跑命令、连开几小时，瓶颈不再是"它会不会写"，而是"人类能否复核、规则能否执行、决策会不会被反复推翻"。这套体系把四件事变成默认：

- **单一事实源**：每个事实只有一个归属文档，其他地方链接过去；
- **能机检就机检**：格式、链接、字数、笔记结构、导出注释都由门禁判定，不靠人记；
- **证据优于自述**：完成的标准是命令真实跑过、文件真实读过，而不是 agent 说"已测试"；
- **决策留痕**：每个非平凡改动留下 why、被否方案与后果，避免同一个问题被重开。

## 快速开始

在目标仓库根目录运行，交互式选择配置：

```sh
npx github:CeejayChen/agent-spec-init .
```

新建一个项目（类似 create-* 脚手架）：

```sh
npx github:CeejayChen/agent-spec-init my-service --template node --pm pnpm
```

非交互运行（agent 或 CI 场景，必须带 `-y`）：

```sh
npx github:CeejayChen/agent-spec-init . -y --template python --lang en
```

先看计划、不落盘：

```sh
npx github:CeejayChen/agent-spec-init . --dry-run
```

## 三种栈配置

| 配置 | 适用 | 门禁方式 | 额外动作 |
|---|---|---|---|
| `node` | TypeScript / JavaScript 项目 | 6 个 TS 门禁，经 `tsx` 运行；写入 `doc-sync`、`test:docs` 等 script 与 `tsx`/`typescript` devDependency | 需要执行包管理器安装 |
| `python` | Python 项目 | 1 个纯标准库脚本 `scripts/doc_gates.py`，含 6 个门禁 | 无需安装依赖 |
| `generic` | Go、Rust、Java 等 | 不生成脚本，改用 `docs/testing.md` 的人工检查清单 | 无 |

`--template auto`（默认）会读 manifest、锁文件与源码分布自动选择；拿不准时显式传入。没有对应工具链的项目请选 `generic`：规范照常生效，门禁不假装存在。

## 生成内容

```
AGENTS.md                     常驻指令：真实命令、目录、约定、验证策略
docs/
  AGENTS.md                   文档标准：每个事实的归属、写作规则、字数预算
  architecture.md             模块地图、数据流、扩展点
  development.md              前置条件、搭建、日常工作流、CI
  testing.md                  测试分层、mock 规则、负向控制、人工检查清单
  defensive-patterns.md       缺陷类型规则
  cookbook/README.md          分步操作手册
  postmortem/README.md        事故复盘
.agents/
  notes/                      Agent Notes：proposed / implemented / rejected × 6 分类
  skills/                     code-review、prose-standard、pre-push-checks
scripts/
  verify-*.ts | doc_gates.py  门禁脚本
  run-gates.ts                门禁编排器（仅 node）
  doc-budgets.manifest.json   文档字数预算
```

命令与目录来自对目标仓库的探测：只有 `package.json` 里真实存在的 script 才会出现在 `AGENTS.md`。探测不到的架构责任会写成 `TODO(agent-spec-init)`，并在运行报告里列出，要求 agent 或人补全——不编造。

## CLI 选项

| 选项 | 说明 | 默认 |
|---|---|---|
| `[directory]` | 目标目录；不存在则新建 | 当前目录 |
| `-t, --template <id>` | `auto`、`node`、`python`、`generic` | `auto` |
| `--name <name>` | 项目名称 | 从 manifest / 目录名探测 |
| `--lang <en\|bilingual>` | 文档语言约定 | 探测是否有中文文档 |
| `--pm <npm\|pnpm\|yarn>` | 包管理器 | 锁文件 / `packageManager` 字段 |
| `--monorepo` | 生成 `packages/AGENTS.md` 与 `packages/README.md` | 探测 workspace |
| `--no-gates` | 不生成门禁脚本 | 关闭（`generic` 恒关闭） |
| `--no-skills` | 不生成起步 Skills | 开启 |
| `--install` | 生成后执行包管理器安装（仅 node） | false |
| `--git` | 目标不是 git 仓库时执行 `git init` | false |
| `--dry-run` | 只打印计划，不写任何文件 | false |
| `--json` | 输出机器可读报告（`files`、`needsAttention`、`nextSteps`） | false |
| `--force` | 覆盖已存在文件与 package.json 中不同的 script | false |
| `-y, --yes` | 接受所有默认值，不提问 | false |
| `--skill-only` | 只安装 spec-init 引导 skill | false |
| `-g, --global` | 配合 `--skill-only` 安装到 `~/.agents/skills/` | false |

`--dry-run` 与真实运行共用同一份计划，预览不会漂移。`--json` 适合 agent 读取结果后逐文件适配。

## 门禁

Node 配置（`npm run doc-sync` 全量，`npm run test:docs` 轻量）：

| 门禁 | 检查内容 |
|---|---|
| `verify-agent-note-format` | 笔记头、Status 行、`## Problem` 起始、必需章节、`implemented` 禁用章节 |
| `verify-agent-note-classification` | 生命周期 / 分类目录与文件名合法 |
| `verify-md-links` | 相对链接目标与锚点存在 |
| `verify-md-wrap` | 每段一个物理行 |
| `verify-doc-budgets` | 常驻文档不超预算，清单文件不缺失 |
| `verify-export-jsdoc` | 导出声明带 JSDoc |

Python 配置（`python scripts/doc_gates.py doc-sync`）：

| 模式 | 说明 |
|---|---|
| `doc-quick` | 不解析源码的轻量门禁 |
| `doc-sync` | 全部门禁，含 `verify-export-docstrings` |
| `verify-agent-note-format` 等 | 单个门禁，便于定位 |

## 交给 agent 自动完成

仓库自带可移植的引导 skill（`.agents/skills/spec-init/SKILL.md`）。装进目标项目后，agent 会自己探测栈、非交互运行本工具、逐文件把模板改成真实项目描述、跑门禁、写首条 Agent Note。任选一种安装方式：

```sh
npx skills add CeejayChen/agent-spec-init               # skills 生态安装器
npx github:CeejayChen/agent-spec-init --skill-only       # 装进当前项目
npx github:CeejayChen/agent-spec-init --skill-only --global  # 装进用户级目录
```

装好后新开 agent 会话，要求它「初始化 agent 规范框架」。

## 安全与合并策略

- **不覆盖手写文件**：已存在且内容不同的文件只报告为 `kept`，不用 `--force` 就不会动。
- **不合并散文**：检测到既有 `AGENTS.md`、`CLAUDE.md`、`.cursorrules` 等，会在报告里列出，要求人工合并规则。
- **package.json 只补不改**：缺少的 script 与 devDependency 才添加；已存在的键保留并在报告里列出；`--force` 也只覆盖脚本值，不删除其他字段。
- **先校验后落盘**：非法 JSON、非法参数、缺失模板都会在写入前失败。
- `--force` 是明确的覆盖操作，只在确认目标可丢弃时使用。

## 开发

```sh
npm install
npm run build        # tsc + 复制模板到 dist/
npm run typecheck
npm test             # 单元 + 集成（真实生成并运行门禁）
npm run doc-sync     # 文档门禁 + 模板渲染门禁 + 翻译配对
npm run dev          # 从 src/ 运行 CLI
```

仓库用自身的规范体系管理自己：`.agents/notes/` 记录决策，`scripts/` 运行门禁，CI 跑完整矩阵。

## 设计原则

- **计划即产品**：`buildPlan` 产出的是一份纯数据的文件计划，唯一写盘的是 `src/apply.ts`，因此 `--dry-run`、测试与真实运行共享同一逻辑。
- **模板只放内容**：占位符替换与按栈生成的正文在 `src/render.ts`、`src/profiles.ts`，模板保持可当散文审阅。
- **按栈生成，不假装通用**：门禁只有在目标栈真能运行时才生成；否则如实降级为人工清单。
- **失败要响**：未知占位符、缺失模板、非法 manifest 都直接报错，不静默跳过。

## 项目由来

本工具把 deepseek-harness 中已验证的治理结构——分层指令、Agent Notes、Skills、46 个校验闸门背后的思路——收敛成可迁移的最小集合：保留元规则，按目标栈再生具体闸门。迁移取舍见 [docs/architecture.md](docs/architecture.md) 与 `.agents/notes/` 中的决策记录。

## 许可

MIT
