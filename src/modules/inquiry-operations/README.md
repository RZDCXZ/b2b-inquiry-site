# 询盘运营模块

拥有询盘、当前负责人、跟进记录、报价记录、关闭结果、垃圾隔离和状态机。它通过公开身份与通知端口协作，不拥有账号或通知投递实现。

当前公开提交边界由以下部分组成：

- `public/inquiry-submission.ts` 校验结构化询盘字段和公开参考号格式。
- `public/inquiry-spam-assessment.ts` 组合蜜罐、最短填写时间、十五分钟速率限制与简单内容风险。
- `server/inquiry-submission-service.ts` 发放一次性令牌，并在可序列化事务中幂等创建正常询盘或独立隔离记录。
- `server/inquiry-query.ts` 分离完整运营记录查询与只包含参考号、可选产品编号的公开安全回执。

正常提交在同一事务中调用通知模块的数据端口；垃圾询盘不会创建通知记录。页面和 Route Handler 只通过 `src/application/public-inquiry.ts` 编排目录与询盘模块。

当前后台生命周期边界由以下部分组成：

- `public/inquiry-lifecycle.ts` 定义待分配、已分配、跟进中、已报价和已关闭之间的完整允许／拒绝操作矩阵。
- `src/application/inquiry-lifecycle.ts` 在真实 PostgreSQL 事务中校验当前负责人、乐观版本和记录内容，追加联系、报价、内部备注、更正、关闭或管理员重开。
- 跟进与状态历史由数据库触发器禁止直接更新或删除；更正只能引用同一询盘的既有记录并追加新历史。
- 历史外键使用 `RESTRICT` 阻止父询盘级联删除；仅本地演示数据维护事务可设置事务级开关后显式清理历史。
- 报价金额使用 `DECIMAL(18,2)`，币种限 USD、EUR、CNY；关闭结果限成交、未成交、无效。
- 每次跟进或状态变化递增询盘版本并写入不复制业务摘要、联系方式或报价金额的脱敏审计。
- `public/operations-dashboard.ts` 定义总览所需的安全询盘读模型，`server/operations-dashboard-query.ts` 在模块内重算全局或当前负责人的状态、来源、到期与关闭统计。
