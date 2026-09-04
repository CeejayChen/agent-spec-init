# Agent Note: Git 安装缺失 CLI 可执行文件

Status: implemented

## Problem

`npx github:CeejayChen/agent-spec-init` 安装了包但报错 "'agent-spec-init' is not recognized"，且 npm 警告 "gitignore-fallback: No .npmignore file found, using .gitignore for file exclusion"。包的 `bin` 指向 `dist/index.js`，但 `dist/` 被列在 `.gitignore` 中，因此 npm 的打包步骤——在没有 `.npmignore` 时回退使用 `.gitignore`——把编译后的 CLI 从 git 安装的包中排除了。

## Decision

显式声明发布面：`"files": ["dist"]` 将构建产物列入白名单，`files` 白名单中的文件无法被 `.gitignore` 或 `.npmignore` 排除。添加 `"prepare": "npm run build"`，使编译后的 CLI 和复制的模板在安装时存在；npm 在安装 git 依赖时会在打包前运行 `prepare`。

## Alternatives considered

- **把 `dist/` 提交到仓库：** 无需构建步骤即可使 git 安装工作，但会跟踪生成产物，且与仓库的 `.gitignore` 策略矛盾。
- **仅添加 `.npmignore`：** 能消除警告，但无法包含检出中不存在的目录；没有 `prepare` 就仍然没有 `dist/` 可打包。
- **发布到 npm：** 仓库安装遵循相同的打包规则，因此该修复同样适用，但 npm 目前不在范围内。

## Consequences

- `npx github:CeejayChen/agent-spec-init` 和 `npm install -g github:...` 现在会在安装时构建 `dist/` 并将其随包发布。
- 版本升级到 0.1.1；0.1.0 的陈旧 npx 缓存必须清除（`rm -rf ~/.npm/_npx`）才能生效。
- 未来的 `npm publish` 只发布 `dist/` 加 package.json 和 README——即预期的运行时内容。
