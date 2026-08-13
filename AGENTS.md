## Agent skills

### Issue tracker

Issue 和规格文档使用本地 Markdown，存放在 `.scratch/`。详见 `docs/agents/issue-tracker.md`。

### Triage labels

使用五个默认 triage 标签：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。详见 `docs/agents/triage-labels.md`。

### Domain docs

采用 single-context 布局。详见 `docs/agents/domain.md`。

### UI design reference

实现或修改采购前台、中文运营后台、响应式页面或交互状态前，先阅读 `DESIGN_PRD.md`，再查看 `product-ui/` 中的可运行高保真设计稿。页面入口与状态清单见 `product-ui/README.md`；视觉和交互参考以 `product-ui/src/App.jsx`、`product-ui/src/styles.css` 与 `product-ui/public/assets/` 为准。实现应延续设计稿的信息层级、字色与间距 token、组件状态、真实图片资产和响应式行为。

设计稿是 Vite 原型，所有页面和演示路由集中在单个 App 入口（当前为 `product-ui/src/App.jsx`），该结构只用于集中预览。真实应用使用 Next.js App Router 时，按规格中的正式 URL、语言前缀和后台信息架构拆分独立 `app/**/page.tsx` 路由；将共享页头、筛选器、表格、状态标签、抽屉等提取为组件，并把路由参数、权限、数据加载、错误边界和页面 metadata 放在对应路由层。不要复制原型中的 `window.history` 路由切换或把真实页面继续集中在一个 App 文件中。
