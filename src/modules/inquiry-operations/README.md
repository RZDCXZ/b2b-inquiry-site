# 询盘运营模块

拥有询盘、当前负责人、跟进记录、报价记录、关闭结果、垃圾隔离和状态机。它通过公开身份与通知端口协作，不拥有账号或通知投递实现。

当前公开提交边界由以下部分组成：

- `public/inquiry-submission.ts` 校验结构化询盘字段和公开参考号格式。
- `public/inquiry-spam-assessment.ts` 组合蜜罐、最短填写时间、十五分钟速率限制与简单内容风险。
- `server/inquiry-submission-service.ts` 发放一次性令牌，并在可序列化事务中幂等创建正常询盘或独立隔离记录。
- `server/inquiry-query.ts` 分离完整运营记录查询与只包含参考号、可选产品编号的公开安全回执。

正常提交在同一事务中调用通知模块的数据端口；垃圾询盘不会创建通知记录。页面和 Route Handler 只通过 `src/application/public-inquiry.ts` 编排目录与询盘模块。
