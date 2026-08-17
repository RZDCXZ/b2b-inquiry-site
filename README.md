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

`demo:reset` 会清除运行中产生的产品、内容、询盘、导入批次、上传素材、会话与审计数据，再恢复完全一致的固定演示状态；本地随机密码保持不变，重新生成的演示素材会写入来源清单，并清空 `.local/uploads`。

固定演示数据包括：

- 4 个分类、50 个产品、6 个虚构车型品牌、12 个车型、12 个发动机、150 条公开适配关系，以及每个产品 2–4 个参考号。
- 8 个文章主题；6 个有中英双语版本，2 个只有英文版本，可直接展示语言回退与缺失翻译。
- 18 条正常询盘和 2 条垃圾隔离记录，覆盖未分配、已分配、跟进中、已报价、已关闭、到期跟进和三种关闭结果。
- 固定的歧义参考号 `ARV-4400`、停产有替代 `TQ-FL-4720`、停产无替代 `TQ-AF-2000`、唯一车型结果，以及导入校验错误和撤销冲突。

导入异常的固定后台路径为：

- `/admin/import/previews/19000000-0000-4000-8000-000000000001`：原子校验错误预览。
- `/admin/import/batches/19000000-0000-4000-8000-000000000003`：导入后继续编辑导致的整批撤销冲突。

图片来源、用途与 SHA-256 记录在 `product-ui/public/assets/manifest.json`；规格 PDF 由本地代码按产品公开快照即时生成并持续叠加虚构演示水印，不依赖外部文件或真实品牌资料。

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
