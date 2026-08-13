# Issue tracker：本地 Markdown

本仓库的 issue 和规格文档以 Markdown 文件形式存放在 `.scratch/`。

## 约定

- 每项功能使用一个目录：`.scratch/<feature-slug>/`
- 规格文档位于 `.scratch/<feature-slug>/spec.md`
- 每张实施工单使用一个独立文件，路径为 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- 工单从 `01` 开始编号，不要把所有工单合并到单个文件
- Triage 状态记录在每个 issue 文件顶部附近的 `Status:` 行中；角色字符串详见 `triage-labels.md`
- 评论和对话历史追加到文件底部的 `## Comments` 标题下

## 当 skill 要求“发布到 issue tracker”时

在 `.scratch/<feature-slug>/` 下创建新文件；目录不存在时一并创建。

## 当 skill 要求“获取相关工单”时

读取用户引用路径对应的文件。用户通常会直接提供文件路径或工单编号。

## Wayfinding 操作

供 `/wayfinder` 使用。一个 map 文件对应每张工单的一个子文件。

- **Map**：`.scratch/<effort>/map.md`，包含 Notes、Decisions-so-far 和 Fog
- **子工单**：`.scratch/<effort>/issues/NN-<slug>.md`，从 `01` 开始编号，问题写在正文中
- 子工单顶部附近的 `Type:` 行记录类型：`research`、`prototype`、`grilling` 或 `task`
- 子工单顶部附近的 `Status:` 行记录状态：`claimed` 或 `resolved`
- **阻塞关系**：在顶部附近使用 `Blocked by: NN, NN`；其中列出的所有工单均为 `resolved` 后，当前工单才解除阻塞
- **Frontier**：扫描 `.scratch/<effort>/issues/`，查找开放、未阻塞且未认领的文件；编号最小者优先
- **认领**：开始工作前，将 `Status:` 设置为 `claimed` 并保存
- **解决**：在 `## Answer` 标题下追加答案，将 `Status:` 设置为 `resolved`，随后把上下文指针（摘要和链接）追加到 `map.md` 的 Decisions-so-far 中
