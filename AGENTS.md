# AGENTS.md

> 本文件约束未来 Codex / AI 开发者。开始任何修改前先阅读 `README.md`、`VISION.md`、`PRODUCT_BACKLOG.md` 和本文件。

## 项目定位

CRA Portal 不是单纯的后台管理系统，而是 CRA 每天打开使用的工作台。开发目标是减少真实工作中的重复操作、遗漏风险和认知负担。

## 技术事实

- 前端是纯静态 `HTML + CSS + 原生 JavaScript`。
- 当前没有 React/Vue、没有构建步骤、没有 npm 脚本。
- 数据通过 `static/js/supabase-client.js` 直连 Supabase REST API。
- 部署到 GitHub Pages 的 `gh-pages` 分支。
- Word 生成使用浏览器端 `docxtemplater + PizZip + FileSaver`。
- `legacy-flask/` 是旧实现归档，除非明确要求，不要把新功能写回旧 Flask。

## 开发原则

1. 每次只完成一个明确 Story，不要顺手重构无关页面。
2. 优先复用现有全局函数、`window.api` 和静态 JS 结构。
3. 任何数据库字段变更必须新增 `supabase/*.sql` 迁移文件。
4. 不要在没有用户确认的情况下执行破坏性 SQL。
5. 不要改 Supabase key、RLS、Storage 权限，除非任务明确要求。
6. 不要把真实项目数据、密码、Token 写进文档或提交。
7. UI 要服务 CRA 工作流，避免营销页、大卡片堆叠和无用说明文字。
8. Dashboard 展示行动和风险，不做单纯数据陈列。
9. AI 功能必须保留人工确认步骤，不自动覆盖正式业务数据。

## 修改前检查

- 当前 Story 的用户场景是什么？
- 它是否符合 `VISION.md` 的产品原则？
- 是否需要数据库迁移？
- 是否影响已有数据？
- 是否需要更新 `README.md`、`PRODUCT_BACKLOG.md` 或 `CHANGELOG.md`？

## 验收标准模板

每个 Story 至少写清楚：

- 目标：这个功能帮 CRA 减少什么操作或风险？
- 范围：本次做什么，不做什么？
- 数据：新增/修改哪些表或字段？
- UI：入口在哪里，用户如何完成流程？
- 验证：如何在本地或线上确认功能可用？

## 常用文件

- `index.html`：页面入口和脚本加载顺序。
- `static/app.js`：路由、全局状态、主入口。
- `static/style.css`：全局样式。
- `static/js/supabase-client.js`：所有 Supabase API。
- `static/js/tasks.js`：待办事项。
- `static/js/projects.js`：项目管理。
- `static/js/centers.js`：中心管理。
- `static/js/findings.js`：监查问题。
- `static/js/ethics.js`：伦理递交信和 Word 生成。
- `supabase/`：数据库建表和迁移 SQL。

## 完成后必须说明

- 修改了哪些文件。
- 是否需要执行 SQL。
- 是否已验证。
- 是否已部署。

## 禁止事项

- 不要执行 `git reset --hard` 或删除用户未要求删除的文件。
- 不要把 `legacy-flask/` 当成当前主架构。
- 不要为了新功能引入框架或构建工具，除非用户明确批准。
- 不要让 Dashboard 变成信息噪音。
- 不要在没有验收标准时让 AI 自行扩大功能范围。
