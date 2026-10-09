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
