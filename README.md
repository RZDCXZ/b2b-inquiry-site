# Torquelis 询盘运营演示系统

Torquelis Filters／拓擎利滤清是一个完全虚构、仅在本地运行的商用车滤清器询盘运营演示系统。当前切片提供可复现的 Next.js 双语产品目录、产品编号／参考号与车型规格查找、产品资料、幂等防垃圾询盘、三种预置角色登录、数据库会话、服务端权限壳层、本地 PostgreSQL、版本化迁移和安全演示重置。

完整仓库公开供审阅，但未授予开源许可证。除法律默认允许的范围外，不应假定代码可以复制、修改或再分发。

## 干净克隆启动

需要精确版本：

- Node.js `24.18.0`（同时记录于 `.node-version` 和 `.tool-versions`）
- pnpm `11.21.0`（由 `packageManager` 锁定）
- Docker Engine `29.7.2` 与 Docker Compose `5.3.1` 是已验证的 macOS 组合；PostgreSQL 镜像使用提交到 Compose 的内容摘要锁定

Node.js 自带的 Corepack 会读取仓库锁定的 pnpm 版本。从干净克隆只需运行一个初始化命令：

```bash
corepack pnpm setup
```

`setup` 会安装锁定依赖、创建未跟踪的 `.env`、生成随机会话密钥与三个预置角色（管理员、内容编辑、两名业务人员）的四组随机密码、启动 Docker PostgreSQL、执行版本化迁移、生成演示素材并载入演示数据。重复运行不会覆盖已有的本地密钥或凭据。

随后启动应用：

```bash
corepack pnpm dev
```

访问：

- `http://localhost:3000/`：固定重定向到英文，不读取浏览器语言
- `http://localhost:3000/en`：英文公共页面
- `http://localhost:3000/zh-cn`：简体中文公共页面
- `http://localhost:3000/admin/login`：简体中文运营后台登录

## 本地演示命令

```bash
corepack pnpm demo:credentials
corepack pnpm demo:reset
```

`demo:credentials` 会在验证环境变量与数据库内身份记录后，显示管理员、内容编辑和两名业务人员的本地凭据。凭据保存在被 Git 忽略且权限为 `0600` 的 `.local/demo-credentials.json`；仓库不包含固定明文密码。

数据重置会先验证数据库 URL 为回环地址、数据库名为 `torquelis_demo`、环境标记匹配，再查询数据库内的身份记录；任一条件未知都会拒绝执行。

`demo:reset` 恢复站点配置、产品与公开发布版本和四个预置账号，清理询盘、垃圾隔离、通知发件箱、数据库会话与登录审计，重新生成演示素材，并清空 `.local/uploads`。

停止数据库时不删除数据卷：

```bash
docker compose down
```

## 自动化检查

```bash
corepack pnpm format
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:integration
corepack pnpm exec playwright install chromium firefox webkit
corepack pnpm test:e2e
corepack pnpm build
```

Linux CI 使用全新 PostgreSQL 执行迁移、种子、格式、Lint、类型检查、单元测试、数据库集成测试、Chromium／Firefox／WebKit 桌面与移动浏览器路径和生产构建。

## 架构入口

- [模块边界](docs/architecture/module-boundaries.md)
- [领域语言](CONTEXT.md)
- [架构决策](docs/adr/)
- [UI 设计依据](DESIGN_PRD.md)

所有产品、公司、联系人、性能参数和经营数据均为演示数据，不可用于真实选型或采购。
