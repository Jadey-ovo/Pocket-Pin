# Pocket Pin

面向移动端的拼豆创作 H5 App。当前工程已从单个静态页面整理为 Vue 3 + TypeScript 的可扩展基础架构。

## 开始运行

```bash
cd pocket-pin-client
npm install
npm run dev
```

## 目录约定

```text
pocket-pin-client/src/
  app/        # 应用入口、路由、全局样式
  core/       # 稳定的领域模型与基础设施（存储等）
  modules/    # 按产品功能拆分：palette、projects、studio…
  shared/     # 跨功能复用的布局与组件
```

## 开发路线

1. 色板数据：维护应用内使用的 MARD 211 色数据。
2. 项目域：完善项目、图层、网格与本地持久化模型。
3. 创作工作台：接入 Canvas 编辑、撤销/重做与图片量化。
4. 输出与同步：制作清单、图纸导出和可选的账号/云同步。


## 文档管理

- [PRD-Pocket Pin](docs/PRD-Pocket-Pin.md)：唯一产品需求主文档，直接迭代正文，文末记录每次修订。
- [验证记录-H5编辑器](docs/验证记录-H5编辑器.md)：按日期追加测试、验收、发布结果与未覆盖项。

`docs/` 文档统一按“类型-名称.md”命名，例如 `PRD-产品名称.md`、`验证记录-功能名称.md`、`设计说明-模块名称.md`。同一产品不按日期、版本或迭代另建 PRD；历史版本通过 Git 追溯。新增需求先更新主 PRD 对应章节，再追加修订记录；验证证据记入验证记录，不混入需求正文。
