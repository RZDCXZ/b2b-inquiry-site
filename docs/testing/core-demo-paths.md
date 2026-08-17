# 核心跨浏览器演示路径

这 6 条路径是公开复现的稳定浏览器边界。测试标题使用 `@demo-core/NN-path`，因此控制台、JUnit 和 HTML 报告都能直接定位失败路径。Playwright 不对这些测试设置项目过滤，所以每条路径都会在 Chromium、Firefox、WebKit 的桌面与移动项目中运行。

| ID | 演示路径 | 自动化入口 | 固定边界 |
| --- | --- | --- | --- |
| `01-public-browse` | 公开浏览 | `tests/e2e/vehicle-fitment-finder.spec.ts` | 从首页逐级选择 Northline HX9、2022、N13-420 与燃油滤清器，进入唯一产品 `TQ-FL-4827` |
| `02-inquiry-submit` | 询盘提交 | `tests/e2e/inquiry-submission.spec.ts` | 从产品详情进入表单，提交后只公开不可推测的询盘参考号，刷新不重复创建 |
| `03-role-login` | 角色登录 | `tests/e2e/role-login-admin-shell.spec.ts` | 匿名重定向、过期会话、管理员、内容编辑与两名业务人员的后台边界和退出 |
| `04-inquiry-follow-up` | 询盘跟进 | `tests/e2e/inquiry-follow-up-lifecycle.spec.ts` | 管理员分配、负责人联系与报价、关闭、管理员重新打开，并保留不可覆盖时间线 |
| `05-content-publish` | 内容发布 | `tests/e2e/product-publishing.spec.ts` | 内容编辑预览、补齐发布条件、发布、恢复旧版本和处理乐观并发冲突 |
| `06-import-preview` | 导入预览 | `tests/e2e/product-import.spec.ts` | Excel 全量错误预览、修正导入、整批撤销、确定性重导入与原子批量发布 |

只运行核心矩阵：

```bash
corepack pnpm test:e2e:core
```

预期收集 36 个场景（6 条路径 × 6 个浏览器/视口项目）。完整回归使用 `corepack pnpm test:e2e`。
