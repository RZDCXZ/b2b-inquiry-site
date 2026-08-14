# 通知模块

拥有本地模拟通知端口与只读发件箱记录。它只声明“已捕获”，不声称邮件真实送达，也不拥有触发通知的业务状态。

询盘正常提交通过 `server/notification-outbox.ts` 的捕获端口原子写入 `NotificationOutboxRecord`，模板为 `new_inquiry_for_administrator`；隔离记录不进入通知发件箱。`server/notification-outbox-query.ts` 提供后续中文后台使用的只读查询边界。
