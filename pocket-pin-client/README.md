# Pocket Pin Client

Pocket-Pin 面向用户的移动端产品工程，使用 Vue 3、TypeScript、Vite、Pinia 和 Vant。

## 本地开发

```bash
npm install
npm run dev
```

## 质量检查

```bash
npm run typecheck
npm test
npm run build
```

## 自动化流程

- Pull Request：检查 Conventional Commit 标题、类型、单元测试和生产构建。
- `main` 分支：检查通过后部署 GitHub Pages。
- 推送到 `main`：Release Please 分析提交并创建或更新发布 PR。
- 合并发布 PR：自动更新版本和 Changelog，创建 Tag、GitHub Release 并上传构建产物。

GitHub Actions 配置位于仓库根目录 `.github/workflows/`。

## 版本自动判断

Pull Request 标题会在 squash merge 后成为 `main` 提交信息，Release Please 据此选择 SemVer 版本：

- `fix: ...` -> patch，例如 `0.1.0 -> 0.1.1`。
- `feat: ...` -> minor，例如 `0.1.0 -> 0.2.0`。
- `feat!: ...` 或提交正文包含 `BREAKING CHANGE:` -> major，例如 `0.1.0 -> 1.0.0`。
- `docs:`、`test:`、`chore:` 等用于标记非功能修改。

常用标题示例：

```text
feat(editor): add pencil tool
fix(palette): correct MARD color code
docs(prd): define project creation flow
feat(storage)!: replace the saved-project format
```
