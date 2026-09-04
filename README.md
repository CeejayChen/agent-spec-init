# agent-spec-init

为任意项目一键初始化 AI 代理开发规范体系。从 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 中提炼的成熟模式，参数化为可复用模板。

## 安装

### 方式一：npx 直接运行（推荐）

无需安装，一行命令直接从 GitHub 运行：

```sh
npx github:yourname/agent-spec-init
```

### 方式二：全局安装

```sh
npm install -g github:yourname/agent-spec-init
```

安装后直接使用：

```sh
agent-spec-init
```

## 快速开始

在目标项目目录下运行，交互式引导完成配置，生成完整的规范文件体系：

```sh
npx github:yourname/agent-spec-init
```

### 非交互模式

```sh
npx github:yourname/agent-spec-init -y --name my-project --pm npm --lang en
```

## 生成内容

运行后，当前目录将包含以下结构：

```
AGENTS.md                          常驻指令：约定、命令、布局
docs/
  AGENTS.md                        文档标准：层级分类、写作规则、字数预算
  architecture.md                  架构映射模板
  development.md                   开发指南：前置条件、设置、日常工作流
  defensive-patterns.md            防御模式：来之不易的缺陷类型规则
  testing.md                       测试策略：层级、mock 规则、快照要求
  cookbook/README.md                操作手册（待填充）
  postmortem/README.md             事后分析（待填充）
packages/
  AGENTS.md                        包级规则：插件导出、生命周期、命名
  README.md                        包开发指南
.agents/
  notes/
    README.md                      Agent Notes 定义：布局、分类、文件格式
    AGENTS.md                      Notes 常驻指令
    archived/AGENTS.md             归档规则
    {proposed,implemented,rejected}/
      {architecture,process,testing,feature,bug-fix,simplification}/
                                   18 个目录（3 生命周期 × 6 分类）
  skills/
    code-review/SKILL.md           PR 审查指导
    prose-standard/SKILL.md        文风标准
    pre-push-checks/SKILL.md       推送前检查选择
scripts/
  verify-*.ts                      6 个机器可验证的门禁脚本
  run-gates.ts                     门禁编排器
  doc-budgets.manifest.json        字数预算配置
```

## CLI 选项

| 选项 | 说明 | 默认值 |
|---|---|---|
| `--name <name>` | 项目名称 | 交互提示 |
| `--lang <en\|bilingual>` | 语言支持 | 交互提示 |
| `--pm <npm\|pnpm\|yarn>` | 包管理器 | 自动检测 |
| `--skip-install` | 跳过依赖安装 | false |
| `--no-gates` | 跳过验证门禁脚本生成 | false |
| `--force` | 覆盖已有文件 | false |
| `-y, --yes` | 接受所有默认值，跳过交互 | false |

## 验证门禁

门禁脚本通过 `npm run doc-sync`（完整）或 `npm run test:docs`（轻量）运行：

| 门禁 | 检查内容 |
|---|---|
| `verify-agent-note-format` | Agent Note 头部块、Status 行、必需章节 |
| `verify-agent-note-classification` | 生命周期/分类目录结构合法性 |
| `verify-md-links` | 相对 Markdown 链接和锚点目标有效 |
| `verify-md-wrap` | 每段落一个物理行（无硬换行） |
| `verify-doc-budgets` | 文档字数不超过 manifest 上限 |
| `verify-export-jsdoc` | 每个导出的 TS 声明都有 JSDoc |
| `verify-translation-pairing` | 翻译三元组配对完整性与 blob hash 同步 |

## 开发

```sh
npm install
npm run build           # tsc + 复制模板到 dist/
npm run dev             # 开发模式运行 CLI
npm run test            # 单元测试
npm run lint            # 类型检查
```

## 设计理念

- **分层文档** — 每个事实只有一个归属，其他地方用链接引用
- **Agent Notes 作为 RFC/ADR** — 带生命周期和分类的持久决策记录
- **机器可验证** — 文档质量由脚本强制执行，而非仅靠人工审查
- **Skills 作为可复用工作流** — 结构化的 AI 代理指导
- **字数预算** — 通过 manifest 防止文档膨胀

## 项目由来

本工具从 `deepseek-harness` 项目中已建立的自研代理规范系统提取并产品化。`deepseek-harness` 中的分层 AGENTS.md 指令体系、Agent Notes 决策记录、复用性 Skills 和机器可验证门禁，被转化为可通过 `npx github:yourname/agent-spec-init` 一键初始化的脚手架工具。

## 许可

MIT
