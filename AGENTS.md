## 项目上下文

- **Issue tracker**：创建、读取或更新 issue、规格、工单及其评论前，阅读 `docs/agents/issue-tracker.md`。
- **Triage**：评估或修改 issue 的 triage 状态前，阅读 `docs/agents/triage-labels.md`。
- **Domain**：探索代码、命名领域概念或评估架构决策前，阅读 `docs/agents/domain.md`。

## UI 实现

实现或修改采购前台、中文运营后台、响应式页面或交互状态前，按顺序：

1. 阅读 `DESIGN_PRD.md`。
2. 从 `product-ui/README.md` 找到相关页面与状态，再检查 `product-ui/src/App.jsx`、`product-ui/src/styles.css` 和 `product-ui/public/assets/` 中对应的实现与资产。
3. 以设计稿的信息层级、字色与间距 token、组件状态、真实图片资产和响应式行为为 UI 验收基线。

生产页面使用 Next.js App Router：按规格中的正式 URL、语言前缀和后台信息架构拆分 `app/**/page.tsx`；共享 UI 提取为组件；路由参数、权限、数据加载、错误边界和 metadata 留在对应路由层。`product-ui/src/App.jsx` 的集中路由和 `window.history` 导航只属于 Vite 设计预览。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
