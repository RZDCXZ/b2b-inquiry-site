# Torquelis 询盘运营演示系统

Torquelis Filters／拓擎利滤清是一个完全虚构、仅在本地运行的商用车滤清器询盘运营系统。它用一个可重置的数据集串联双语产品目录、车型与规格查找、结构化询盘、角色权限、跟进报价、内容发布、Excel 导入和审计证据，用于展示制造企业询盘站的产品化定制能力，而不是 SaaS、真实客户系统或商业运营案例。

完整仓库公开供审阅，但未授予开源许可证。除法律默认允许的范围外，不应假定项目代码和自有展示素材可以复制、修改或再分发。第三方软件与字体仍分别适用其原许可证，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 干净克隆启动

需要精确版本：

- Node.js `24.18.0`（同时记录于 `.node-version` 和 `.tool-versions`）
- pnpm `11.21.0`（由 `packageManager` 锁定）
- Docker Engine `29.7.2` 与 Docker Compose `5.3.1` 是已验证的 macOS 组合；PostgreSQL 镜像使用提交到 Compose 的内容摘要锁定

Node.js 自带的 Corepack 会读取仓库锁定的 pnpm 版本。从干净克隆只需运行一个初始化命令：

```bash
corepack pnpm setup
```

`setup` 会安装锁定依赖、从 `.env.example` 创建未跟踪的 `.env`、生成随机会话密钥与四组随机本地密码、启动 Docker PostgreSQL、执行版本化迁移、生成演示素材并载入固定数据。重复运行不会覆盖已有的本地密钥或凭据；CI 中只确认账号生成成功，不把密码写入日志。

随后启动应用：

```bash
corepack pnpm dev
```

访问：

- `http://localhost:3000/`：固定重定向到英文，不读取浏览器语言
- `http://localhost:3000/en`：英文公共页面
- `http://localhost:3000/zh-cn`：简体中文公共页面
- `http://localhost:3000/admin/login`：简体中文运营后台登录

若要按生产模式验证本地构建：

```bash
corepack pnpm build
corepack pnpm start
```

### 本地配置边界

| 配置 | 类别 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 必填 | 仅允许回环地址、固定用户和 `torquelis_demo` 数据库；示例密码只保护本机 Docker 演示库 |
| `DEMO_ENVIRONMENT_ID` | 必填 | 与数据库内身份记录共同防止重置未知数据库 |
| `BETTER_AUTH_SECRET` | 必填、自动生成 | `setup` 将占位符替换为随机本地密钥，不能提交 `.env` |
| `BETTER_AUTH_URL` | 必填 | 本地认证基址，默认 `http://127.0.0.1:3000` |
| `TORQUELIS_SEO_MODE` | 仅显式 SEO 演示 | 正常启动和测试不需要；只有精确值 `public` 才开启公开 SEO |

没有可选的真实邮件、对象存储、分析、CRM 或营销配置。默认 `TORQUELIS_SEO_MODE="private"` 时，所有公开页面输出 `noindex`，`robots.txt` 阻止抓取，`sitemap.xml` 返回 404。只有把值精确改为 `public` 并重启，才会启用以保留域名 `https://torquelis.example` 为基址的 Canonical、Hreflang、JSON-LD 和站点地图演示；缺失变量、`true`、大小写变体或请求参数都不会开启索引。

## 角色与权限

| 角色 | 演示账号 | 可以做什么 | 明确不能做什么 |
| --- | --- | --- | --- |
| 海外采购者 | 匿名 | 浏览目录、查找产品、下载演示规格资料、提交询盘 | 访问后台或查询完整询盘 |
| 管理员 | 1 个随机密码本地账号 | 查看全部后台、分配或重开询盘、查看通知与审计、维护站点配置 | 在后台读取或修改环境密钥 |
| 内容编辑 | 1 个随机密码本地账号 | 维护并发布产品与内容、管理素材、预览并执行 Excel 导入 | 查看完整询盘联系方式和内部记录、修改安全配置 |
| 业务人员 | 2 个随机密码本地账号 | 仅查看本人当前负责询盘，追加联系、报价、更正和关闭记录 | 查看未分配或他人负责的询盘、进入内容与配置区域 |

运行以下命令可再次显示当前本地随机凭据；凭据文件被 Git 忽略并强制使用 `0600` 权限：

```bash
corepack pnpm demo:credentials
```

## 演示数据、重置与 Excel

`demo:reset` 会先验证数据库 URL、环境标记和数据库内身份记录，随后清除运行中产生的产品、内容、询盘、导入批次、上传素材、会话与审计数据，恢复完全一致的固定状态。随机密码保持不变，临时上传被清空。

```bash
corepack pnpm demo:reset
corepack pnpm demo:verify
```

固定状态包含 4 个分类、50 个产品、6 个虚构车型品牌、12 个车型、12 个发动机、150 条公开适配关系、8 个文章主题、18 条正常询盘和 2 条垃圾隔离记录。它还包含歧义参考号 `ARV-4400`、停产替代、唯一车型结果、导入校验错误和撤销冲突。

Excel 模板在管理员或内容编辑登录后从 `/admin/import` 的“下载模板与字段说明”取得。工作簿固定包含“产品、翻译、规格值、参考号、适配关系”五张表，通过产品编号关联；错误预览提供工作表、行号、字段、错误代码和修正建议，并可下载错误报告。无需上传即可查看的固定异常路径为：

- `/admin/import/previews/19000000-0000-4000-8000-000000000001`：原子校验错误预览
- `/admin/import/batches/19000000-0000-4000-8000-000000000003`：导入后继续编辑导致的整批撤销冲突

停止数据库但保留数据卷：

```bash
docker compose down
```

## 自动化检查与证据

在完成 `setup` 后，可分别运行：

```bash
corepack pnpm verify:public
corepack pnpm format
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:integration
corepack pnpm demo:reset
corepack pnpm exec playwright install chromium firefox webkit
corepack pnpm test:e2e:core
corepack pnpm test:e2e
corepack pnpm build
```

`verify:public` 检查所有 Git 跟踪文件中的本地秘密路径、机器专属用户目录、私钥、常见服务令牌和个人邮箱。`test:e2e:core` 在 Chromium、Firefox、WebKit 的桌面与移动项目中各运行 6 条稳定命名的核心路径，共 36 个场景；完整映射见 [核心演示路径](docs/testing/core-demo-paths.md)。

GitHub Actions 从干净 checkout 调用同一个 `pnpm setup`，再执行公开安全检查、格式、Lint、类型检查、迁移后的数据验证、单元/集成测试、确定性重置、生产构建和完整 E2E。每次运行保留 30 天的 `verification-evidence-<commit>` artifact，其中包含：

- 当前提交、Node/pnpm/Docker 版本和脱敏数据计数形成的干净复现证据；
- 可按浏览器项目与 `@demo-core/NN-path` 定位失败的 JUnit 结果；
- HTML Playwright 报告，以及失败重试时的 trace、截图或其他测试附件。

## 架构边界

应用是一个 Next.js App Router 模块化单体：`app/**` 保留路由参数、权限、数据加载、错误和 metadata；`src/application/**` 编排用例；`src/modules/**` 按目录、询盘运营、内容发布、身份权限、通知与站点配置划分；Prisma/PostgreSQL 提供持久化。项目没有独立前端 API 服务、第三方 CMS 或完整 CRM 边界。

- [模块边界](docs/architecture/module-boundaries.md)
- [领域语言](CONTEXT.md)
- [架构决策](docs/adr/)
- [UI 设计依据](DESIGN_PRD.md)

## 许可、来源与已知边界

图片的来源说明、用途与 SHA-256 记录在 `product-ui/public/assets/manifest.json`；规格 PDF 由本地代码按产品公开快照即时生成并持续叠加虚构演示水印，不依赖外部文件或真实品牌资料。字体、直接软件依赖和 PostgreSQL 镜像来源记录在 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

本仓库只在 macOS 本地演示环境和 Linux GitHub Actions 上验收，不承诺 Windows 原生环境支持，也不代表已完成生产部署、真实邮件投递、对象存储、监控、备份、隐私合规或第三方系统集成。所有企业、产品、联系人、性能参数和经营数据均为虚构演示数据，不可用于真实选型或采购；本项目不声称或承诺流量、排名、询盘、成交额等商业运营结果。
