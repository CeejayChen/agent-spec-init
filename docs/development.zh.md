# 开发指南

面向 agent-spec-init 的上手说明：前置条件、环境搭建、日常工作流，以及 CI 运行什么。

## 前置条件

- Node.js 20 或更高版本（构建脚本使用 `import.meta.dirname`）
- npm，与 `package-lock.json` 匹配
- Git 2.26 或更高版本
- Python 3.10 或更高版本，用于在本地验证生成的 Python 门禁

## 环境搭建

安装依赖并构建可分发包：

```sh
npm install
npm run build
```

跑一次测试确认检出可用：

```sh
npm test
```

当 `npm test` 与 `npm run doc-sync` 都成功退出时，环境搭建完成。

## 本地试用 CLI

`npm run dev` 直接从 `src/` 运行 CLI。验证发布路径时，先构建，再运行 `node dist/bin.js <目标目录> --dry-run`。始终往可丢弃的目录里生成；`--force` 会替换目标中的文件。

## 日常工作流

1. 从 `main` 拉出分支。
2. 完成改动，保持 `npm run typecheck` 与 `npm test` 通过。
3. 为每个非平凡改动新增或更新一条 Agent Note。
4. 写 PR 之前运行 `npm run doc-sync` 并修掉所有违规。
5. 提交 PR，说明改动、证据，以及新增或更新的 Agent Notes。

## 修改生成文档

修改 `src/templates/` 下的模板，而不是 `dist/`。随后运行 `npm run build`、`npm run verify-templates` 与 `npm test`；集成测试会为每种配置生成项目并运行其门禁。预算调整写在 [src/plan.ts](../src/plan.ts) 的 `DOCUMENT_BUDGETS` 中，并在同一个 PR 里说明理由。

## CI

CI 对每个 PR 和每次推送到 `main` 都运行 `npm ci`、`npm run build`、`npm run typecheck`、`npm test` 与 `npm run doc-sync`。工作流位于 `.github/workflows/ci.yml`；保持它与上述命令一致。
