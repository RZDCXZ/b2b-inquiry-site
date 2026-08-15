# 身份权限模块

拥有预置账号、数据库会话、角色和服务端权限矩阵。它不拥有询盘分配、内容发布或环境安全配置。

## 公开边界

- `public/permissions.ts` 定义管理员、内容编辑、业务人员与权限矩阵，供后台导航和服务端入口共同使用。
- `server/authorization.ts` 从 Better Auth 数据库会话提取最小操作人信息，并为页面与 Route Handler 返回统一授权结果。
- `server/preset-credentials.ts` 只管理被忽略的本地明文凭据文件；数据库仅接收 Better Auth scrypt 哈希。

页面、Server Action 与 Route Handler 必须在接近数据源的位置重新授权。隐藏导航只用于减少无关入口，不构成权限边界。

`server/audit-query.ts` 拥有审计筛选、稳定游标和只读基础视图；对象的业务标识由 application 层调用各领域模块的公开能力解析，身份模块不跨边界读取产品、内容或询盘表。
