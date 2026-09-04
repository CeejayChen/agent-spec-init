# 开发指南



设置教程带领新贡献者从前置条件到成功检出。随后的贡献者参考涵盖仓库布局、日常工作流和 CI 组织。

## 设置教程

### 前置条件

- Node.js 18+（推荐 LTS）
- npm（最新稳定版）
- Git 2.26+

### 首次设置

从仓库根目录安装依赖：

```sh
npm install
```

首次克隆后运行一次类型检查：

```sh
npm run typecheck
```

当 `npm run typecheck` 成功退出时，设置完成。

## 贡献者参考

### 项目布局

```
.agents/       代理工作流、Notes 和 Skills
docs/          架构、开发指南、防御模式、测试策略
scripts/       验证门禁和生成器
packages/      项目包
```

### 日常工作流

1. 从主分支创建功能分支。
2. 进行修改，确保 `npm run typecheck` 和 `npm run lint` 通过。
3. 为非平凡变更添加或更新 Agent Note。
4. 运行 `npm run doc-sync` 验证文档门禁。
5. 提交带有清晰描述和关联 Agent Note 的 PR。

### CI 概述

CI 运行以下检查：

- `npm run typecheck` — TypeScript 编译
- `npm run lint` — 代码风格和质量
- `npm run test` — 单元测试
- `npm run doc-sync` — 文档门禁
