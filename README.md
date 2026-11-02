# Pocket Pin

面向手机、平板和桌面浏览器的拼豆创作 H5，支持照片生成图纸、现成图纸识别、绘制编辑、材料统计与图片导出。产品范围以 [PRD](docs/PRD-Pocket-Pin.md) 为准；当前工作分支能力不等于线上已发布能力。

## 使用与开发入口

客户端位于 [pocket-pin-client/](pocket-pin-client/)，开发、检查和发布说明见 [客户端说明](pocket-pin-client/README.md)。

```bash
cd pocket-pin-client
npm install
npm run dev
```

## 文档与目录

- [文档导航](docs/README.md)：产品事实、规划、设计和验证材料的职责与入口。
- [仓库结构设计](docs/设计说明-仓库结构.md)：当前模块边界、后续整理方案及本轮功能核实依据。
- [协作约束](AGENTS.md)：文档维护与发布约定。

现有代码沿用 `src/app`（入口、路由、样式）、`src/core`（模型与色卡）、`src/modules`（业务模块）、`src/shared`（公共界面与辅助能力）。单元测试跟随代码，独立图纸验收页面位于客户端 `qa/`，自动化发布配置位于 `.github/workflows/`。本轮不迁移代码或创建模板目录。
