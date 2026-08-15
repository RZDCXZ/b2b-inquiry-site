# 内容发布模块

拥有中英文公开内容、草稿校验、预览、不可变发布版本与恢复，以及本地图片和 PDF 素材的安全上传与引用保护。产品结构由产品目录模块拥有，站点联系方式由站点配置模块拥有。

`server/operations-dashboard-query.ts` 从当前草稿与发布版本重算产品、核心页面和文章的待发布数量。
`public/operations-audit.ts` 提供文章主题标识解析能力；审计读取仍由 application 层编排，不跨模块读取内容表。
