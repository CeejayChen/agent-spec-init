# Agent Note: 生成门禁的跨平台路径处理

Status: implemented

## Problem

生成的 `verify-export-jsdoc` 门禁用正斜杠子串 `/src/` 过滤收集到的文件。Windows 上 `collectFiles` 返回反斜杠路径，过滤结果为零个文件，门禁于是在未检查任何内容的情况下报告成功——一个不会失败的门禁。Linux CI 上分隔符匹配，才暴露出脚手架自身测试夹具里缺 JSDoc 的导出。同样的分隔符假设还让 `verify-md-wrap` 在 Windows 上无法排除归档笔记。

## Decision

`collectFiles` 在所有平台上返回正斜杠路径；所有按路径片段过滤的门禁改用与分隔符无关的模式，接受片段名两侧的任意一种斜杠，例如 `node_modules` 或 `vendor`。诊断信息输出的仓库相对路径同样使用正斜杠，使输出跨平台稳定。JSDoc 门禁同时接受单行 `/** 契约 */` 注释，测试夹具也为其导出补上文档。

## Alternatives considered

**只修测试夹具。** CI 会变绿，但 Windows 上的门禁仍是空转；缺陷会随脚手架进入每个生成项目。

**在每个过滤器中按 `path.sep` 分支。** 每条过滤都要维护两条代码路径，归档笔记的排除仍容易写错；返回单一规范分隔符更简单，也让诊断稳定。

**引入 glob 库。** 为生成的门禁增加依赖，违背它们只用标准库与既有 devDependency 的设计；归一化本身就是问题的解。

## Consequences

- `tests/repo-files.spec.ts` 固定分隔符契约；新增的负向控制证明 JSDoc 门禁会标记未文档化的导出，而不是空转通过。
- Windows 上生成的项目现在会真正运行导出文档门禁。此前带着未文档化导出却通过的项目会报告违规，这正是生成文档已经声明的契约。
