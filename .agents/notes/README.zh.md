# Agent Notes



这里存放一类设计文档。**Agent Note** 记录影响此代码库的决策或提案——*为什么*以及*我们放弃了什么*，这些是代码和文档无法承载的部分。本文件定义了 Agent Note 的存放位置、何时编写，以及[文件内格式](#文件格式)。

## 布局和命名

每个 Agent Note 有两个维度，都编码在其**路径**中——`{lifecycle}/{class}/yyyy-mm-dd-topic-title.md`：

- **生命周期**（顶层文件夹）是 Agent Note 的状态：
  - **`proposed/`** — 实现前审查的提案；尚未构建。
  - **`implemented/`** — 决策已发布。文件记录了决定和被拒绝的内容，并与实际发布的内容保持同步。
  - **`rejected/`** — 提案已被考虑并拒绝。仅在其理由能防止诱人错误时保留；否则删除。
- **分类**（嵌套文件夹）是决策的*类型*——参见[分类](#分类)。

文件名中的日期是该主题**首次提出**的时间。Agent Note 之间的交叉引用使用相对 Markdown 链接——绝不使用裸文本或编号。

## 分类

每个 Agent Note 属于以下封闭集合中按路径编码的一个分类：

| 分类 | 涵盖内容 |
|---|---|
| `feature` | 面向用户或模型的新能力。 |
| `bug-fix` | 修正缺陷或弥补差距。 |
| `simplification` | 移除代码、行为或表面积，不添加能力。 |
| `architecture` | 关于已发布源码的结构决策——模块如何关联、运行时词汇是什么。 |
| `process` | 代码周围的工具、策略或工作流——门禁、包管理器——而非运行时行为。 |
| `testing` | 测试基础设施和策略。 |

## 何时编写

每个非平凡变更必须在同一 PR 中添加或更新至少一个 Agent Note。当变更改变了行为、架构、跨文件或包共享的契约、流程或工具、测试策略、磁盘/线路/配置格式，或其他维护者可能合理重新审视的决策时，即为非平凡变更。

更新已拥有该决策的 Agent Note 即满足规则；不要创建重复项。仅纯粹机械性或局部的、不改变行为、契约、结构、流程或理由的编辑豁免。

## 文件格式

每个活跃的 Agent Note 遵循一种文件内格式。

### 头部块

每个 Agent Note 的前三行严格为：

```markdown
# Agent Note: <title>

Status: <status>
```

后跟一个空行。`Status:` 的值为以下之一：

- `Status: proposed`
- `Status: implemented`
- `Status: rejected — <原因，一行>`

### 正文骨架

每个 Agent Note 以 `## Problem` 开始正文——即动机，写成无需解决方案即可独立理解的形式。

#### `proposed/`

```markdown
## Problem
## Proposal
…自定义章节…
## Alternatives considered
## Acceptance criteria
## Risks
```

#### `implemented/`

```markdown
## Problem
## Decision
…自定义章节…
## Alternatives considered
## Consequences
```

#### `rejected/`

被拒绝的 Agent Note 是提案的冻结版本。裁决在 `Status:` 行上。

### Alternatives considered — 必填

每个 Agent Note 都包含一个 `## Alternatives considered` 章节：每个真实的替代方案及其落选原因，每个替代方案一个粗体引导的段落。没有记录败选方案的决策会招致重新争论。
