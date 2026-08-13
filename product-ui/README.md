# Torquelis Product UI

基于 `DESIGN_PRD.md` 与选定的 Product Design 方案 1（Precision Ledger）制作的完整可点击高保真设计稿。

## 设计稿入口

- `/design-index`：设计基础、页面目录与关键状态清单
- `/`：英文采购首页
- `/products`：车型与规格查找、唯一结果与无结果
- `/product`：产品详情、公英制与停产替代状态
- `/inquiry`、`/success`：产品询盘与安全回执
- `/admin`：中文运营总览
- `/admin/inquiries`：询盘工作台与垃圾询盘
- `/admin/inquiries/TQI-7K4P-92MX`：报价、关闭、时间线与权限拒绝
- `/admin/import`：Excel 上传、错误预览、通过预览、导入与撤销冲突
- `/admin/products`、`/admin/products/TQ-FL-4827`：产品列表与双语编辑
- `/admin/content`：不可变发布版本
- `/admin/outbox`：本地模拟通知发件箱
- `/admin/settings`、`/admin/audit`：站点配置与只读审计

## 验证

```bash
npm run build
npm run test:sites
```

视觉对照与交互验收记录见 [`design-qa.md`](./design-qa.md)。
