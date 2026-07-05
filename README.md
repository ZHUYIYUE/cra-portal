# CRA Portal

CRA Portal 是一个面向 CRA（日常临床试验监查/项目管理）的轻量 Web 工具，用于集中管理项目、中心、待办事项、监查问题和伦理递交信。

## 当前架构

- 前端：纯静态 `HTML + CSS + 原生 JavaScript`
- 后端：Supabase（PostgreSQL + Storage，前端直连 PostgREST）
- 部署：GitHub Pages（`gh-pages` 分支）
- Word 生成：`docxtemplater + PizZip + FileSaver`

## 线上地址

https://zhuyiyue.github.io/cra-portal/

## 主要功能

- 项目管理
- 中心管理
- 待办事项和日历视图
- 监查问题 Findings 追踪
- 伦理递交信管理
- 基于公司 Word 模板自动生成递交信

## 关键目录

```text
index.html          # 静态入口
static/             # 前端样式和业务 JS
supabase/           # 数据库建表/迁移 SQL
deploy.bat          # Windows 一键部署脚本
HANDOVER.md         # 详细交接文档
legacy-flask/       # 旧 Flask/JSON 实现归档，仅供参考
```

## 部署

详见 `部署指南.md`。

## 开发注意

- 当前没有构建步骤，修改静态文件后部署到 `gh-pages` 即可。
- Supabase publishable key 在前端公开，当前 RLS 策略是内部工具式全开放。
- `center_count` 是前端读取时计算字段，不是数据库列。
- Word 模板应基于原始 `.docx` 修改，避免丢失页眉、页脚和样式。