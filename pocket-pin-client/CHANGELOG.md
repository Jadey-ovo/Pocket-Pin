# 版本更新说明

## [0.2.0](https://github.com/Jadey-ovo/Pocket-Pin/compare/v0.1.0...v0.2.0) (2026-10-10)


### Features

* enhance Pocket Pin studio ([71ae976](https://github.com/Jadey-ovo/Pocket-Pin/commit/71ae97649298e42037a383484a6e5b84467d797c))
* improve image generation, placement and export preview ([e624a1b](https://github.com/Jadey-ovo/Pocket-Pin/commit/e624a1be24fdc5e6bfeb06ba5d50e6187cd58314))
* **studio:** add Pocket Pin workspace ([c0020e4](https://github.com/Jadey-ovo/Pocket-Pin/commit/c0020e4aefbe0ea5e5151516e857abde9eab1fb6))
* **studio:** 增加参考图显隐按钮并保存显示状态 ([f8b63a0](https://github.com/Jadey-ovo/Pocket-Pin/commit/f8b63a02c805bdce1502b0aae397e2e7bd706147))
* 优化图纸管理、豆板裁切与导出体验 ([ee4f4af](https://github.com/Jadey-ovo/Pocket-Pin/commit/ee4f4afa3abf4775fd664fbdce38f3c53bbed2c7))
* 新增首次访问本地保存与备份说明 ([a6b1fa3](https://github.com/Jadey-ovo/Pocket-Pin/commit/a6b1fa37d1660e7e5b5811c821575a5ba503db2c))


### Bug Fixes

* **client:** bundle palette and print model for Pages ([58abbe1](https://github.com/Jadey-ovo/Pocket-Pin/commit/58abbe1e032230a572c9d6a522854978ae18bcfa))
* 保存说明分点展示并调整图纸导出提示 ([1d67aa9](https://github.com/Jadey-ovo/Pocket-Pin/commit/1d67aa916bc4b05afdb5987ce6f1d9b42c627401))

## 2026年10月10日 · 保存说明优化

- 优化保存说明排版：采用三点编号展示，方便逐项阅读。
- 调整作品保存建议：移除 JSON 备份描述，明确提示重要作品及时导出图纸。

## 2026年10月10日 · 本地保存提示

- 新增首次访问说明：清晰告知图纸仅保存在当前设备与浏览器中，不支持自动跨设备同步。
- 完善隐私与备份提示：说明分享网站链接不会公开个人图纸，并提醒清理网站数据或使用无痕模式时注意备份。
- 优化提示体验：确认阅读后，同一浏览器后续访问不再重复弹出。

## 2026年10月10日 · 参考图功能优化

- 新增参考图显隐按钮：位于透明度滑块左侧，可随时切换参考图显示状态，并保留透明度与位置设置。
- 完善参考图描画体验：保存后，保持显示的参考图可作为画笔绘制底图；显隐状态随作品保存，重新打开时自动恢复。

## 2026年10月10日 · 图纸管理与导出优化

- 优化图纸管理：新增卡片与列表视图切换，支持按完成状态筛选，并展示图纸尺寸、颜色数量及拼豆用量。
- 提升作品操作效率：列表支持侧滑编辑、复制、导出与删除，新增已完成标识；图纸采用分批加载，改善大量作品的浏览体验。
- 完善豆板尺寸调整：支持自定义宽高及拖动图纸选择裁切位置，调整前可预览保留区域，裁切涉及拼豆时提供确认提示。
- 丰富导出设置：支持多种背景颜色及 PNG 透明背景，可按需显示作品名称；作品导出支持控制用量信息显示，默认保留完整豆板范围。
- 优化图纸导出排版：调整标题、图纸与用量信息布局，提升导出内容的可读性。
- 改善编辑体验：优化工具栏拖动与滚动操作、参考图透明度调节及色卡展示，修正圆豆在较小缩放比例下的显示效果。
- 优化英文界面：精简移动端操作文案，完善筛选计数和数量单位显示。

---

每次线上更新均须在此记录正式中文说明，按功能分点描述实际新增、优化与修复内容，最新记录置于顶部。自动生成的技术变更记录可作为补充，不能替代面向用户的更新说明。
