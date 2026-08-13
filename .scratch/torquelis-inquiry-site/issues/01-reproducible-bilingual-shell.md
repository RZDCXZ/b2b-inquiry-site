# 01 — 可复现的双语应用外壳

**What to build:** 让仓库审阅者从干净克隆运行一次初始化命令，即可启动本地 PostgreSQL 和应用，并访问采用工业编辑风的英文／简体中文公共页面；同时建立后续切片可复用的模块边界、迁移、测试和安全重置骨架。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 锁定 Node.js、pnpm 和主要依赖版本，安装后可以运行格式、Lint、类型检查、测试和生产构建命令。
- [x] 初始化命令能够创建未跟踪的本地环境、启动 Docker PostgreSQL、执行全新迁移并启动最小演示数据。
- [x] 根地址固定重定向到英文，英文与简体中文公共页面均可访问，且不根据浏览器语言自动跳转。
- [x] 应用按产品目录、内容发布、询盘运营、身份权限、通知和站点配置建立明确模块边界。
- [x] 公共页面具备工业编辑风基础字色、响应式布局、键盘焦点和减少动态效果支持。
- [x] 演示重置骨架会验证本地数据库身份，拒绝非本地或身份不明的目标。
- [x] Linux CI 能在全新数据库上完成迁移、基础检查和生产构建，macOS 本地启动流程经过人工验证。

## Comments

- 2026-08-13：完成实现。已从空 `.env`、空 `.local/` 和全新 Docker 数据卷在 macOS 运行 `pnpm setup`；格式、Lint、类型检查、Vitest、真实 PostgreSQL 集成测试、Playwright 双语路径、演示重置与生产构建均通过。Linux 全新数据库验证写入 `.github/workflows/ci.yml`。
- 2026-08-13：代码审查后收紧模块所有权和 Zod 配置边界，补齐键盘 Tab 交互及 Chromium／Firefox／WebKit 桌面与移动矩阵；移除应由 ticket 20 实现的 SEO 模式。复核验证全部通过。
