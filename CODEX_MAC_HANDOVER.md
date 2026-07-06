# CRA Portal - Mac Codex 维护交接文档

> 面向出差期间使用 Mac 版 Codex 继续维护 CRA Portal。
> 更新日期：2026-07-06
> 线上地址：https://zhuyiyue.github.io/cra-portal/
> GitHub 仓库：https://github.com/ZHUYIYUE/cra-portal

---

## 1. 当前状态速览

CRA Portal 是一个纯静态 CRA 工作助理系统，用于管理临床试验项目、中心、待办、监查问题、伦理递交和 Word 递交信生成。

当前架构：

- 前端：`index.html` + `static/style.css` + 原生 JavaScript
- 后端：Supabase PostgreSQL + Storage，前端通过 PostgREST 直连
- 部署：GitHub Pages，`gh-pages` 分支承载线上静态文件
- 构建：无构建步骤，无 React/Vue/Vite
- 主要入口：`index.html`
- API 层：`static/js/supabase-client.js`
- 业务页面：`static/js/*.js`

最近已完成并部署的功能：

| 功能 | main 提交 | gh-pages 提交 |
|---|---:|---:|
| 工作台 Dashboard | `7d4a3be` | `7dc7b08` |
| 全局快速搜索 | `5789fb3` | `2d65100` |
| 中心驾驶舱 | `5bf30ac` | `efdffbd` |
| 项目驾驶舱 | `d1b450c` | `feae40b` |

当前 `main` 与 `origin/main` 已同步，最后提交为：

```bash
d1b450c feat: add project cockpit overview
```

---

## 2. Mac 接手建议

### 2.1 推荐本地目录

Mac 上建议放在：

```bash
~/Projects/cra-portal
```

克隆：

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone https://github.com/ZHUYIYUE/cra-portal.git
cd cra-portal
```

确认分支：

```bash
git status
git branch --show-current
git log --oneline -5
```

### 2.2 给 Mac Codex 的推荐开场提示

可以直接把下面这段发给 Mac 版 Codex：

```text
请接手维护 CRA Portal。先阅读 CODEX_MAC_HANDOVER.md、HANDOVER.md、index.html、static/app.js、static/js/supabase-client.js，再根据我的需求改代码。项目是纯静态 HTML/CSS/原生 JS，无构建步骤；main 是源码分支，gh-pages 是部署分支。修改后请跑 JS 语法检查，提交 main，推送，再同步静态文件到 gh-pages 并推送部署。
```

---

## 3. 核心文件地图

| 文件 | 用途 |
|---|---|
| `index.html` | 页面壳、侧边栏导航、CDN 依赖、所有 JS 加载顺序 |
| `static/app.js` | 应用初始化、页面路由、全局搜索、弹窗、导出入口 |
| `static/style.css` | 全局样式，含工作台、项目驾驶舱、中心驾驶舱、搜索样式 |
| `static/js/supabase-client.js` | Supabase API 封装，所有数据库读写入口 |
| `static/js/dashboard.js` | 今日工作台、风险摘要、快速入口 |
| `static/js/projects.js` | 项目列表、项目详情、项目驾驶舱、中心列表、项目待办 |
| `static/js/centers.js` | 中心详情、中心驾驶舱、研究人员、伦理、方案偏离 |
| `static/js/tasks.js` | 待办列表、待办表单、项目/中心预选逻辑 |
| `static/js/findings.js` | 监查问题列表、筛选、新建/编辑问题 |
| `static/js/ethics.js` | 伦理递交、递交信记录、Word 模板生成 |
| `static/js/utils.js` | HTML 转义、日期、toast、loading 等工具函数 |
| `supabase/*.sql` | 数据库建表和迁移脚本，已在 Supabase 执行过 |
| `HANDOVER.md` | 原始完整交接文档，偏项目全貌 |
| `CODEX_MAC_HANDOVER.md` | 本文档，偏 Mac Codex 接手和维护流程 |

---

## 4. 技术与运行方式

### 4.1 无需安装依赖

当前系统没有 `package.json`，不需要 `npm install`。

依赖来自 CDN：

- Font Awesome
- SheetJS `xlsx`
- PizZip
- docxtemplater
- FileSaver

### 4.2 本地预览

可以直接打开 `index.html`，也可以起一个简单静态服务：

```bash
cd ~/Projects/cra-portal
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

注意：系统会直连 Supabase 和 CDN，需要联网。

### 4.3 语法检查

Mac 上推荐用 Node 检查所有 JS：

```bash
node --check static/app.js
find static/js -name '*.js' -print0 | xargs -0 -n1 node --check
```

提交前再跑：

```bash
git diff --check
git status --short
```

---

## 5. Git 分支与部署流程

### 5.1 分支职责

- `main`：源码开发分支
- `gh-pages`：GitHub Pages 部署分支

不要只推 `main`，否则线上不会更新。功能完成后必须同步到 `gh-pages`。

### 5.2 标准开发流程

```bash
cd ~/Projects/cra-portal
git checkout main
git pull origin main

# 修改代码后检查
node --check static/app.js
find static/js -name '*.js' -print0 | xargs -0 -n1 node --check
git diff --check

# 提交 main
git status --short
git add index.html static supabase CODEX_MAC_HANDOVER.md HANDOVER.md README.md 部署指南.md
git commit -m "feat: describe change"
git push origin main
```

如果只改了部分文件，`git add` 可以只添加实际改动文件，不必照抄上面整行。

### 5.3 部署到 GitHub Pages

常用方式：从 `main` 拷贝静态文件到 `gh-pages`。

```bash
git checkout gh-pages
git pull origin gh-pages

# 按实际改动选择文件。通常至少包含 static 和 index.html。
git checkout main -- index.html static

node --check static/app.js
find static/js -name '*.js' -print0 | xargs -0 -n1 node --check
git diff --check

git status --short
git add index.html static
git commit -m "deploy: describe change"
git push origin gh-pages

git checkout main
```

线上刷新通常需要几十秒到 1-2 分钟。

---

## 6. 已完成优化说明

### 6.1 今日工作台

文件：`static/js/dashboard.js`、`static/style.css`

现在首页不是简单统计，而是工作台：

- 风险指标
- 快捷入口
- 近期任务
- 问题、伦理递交信摘要

### 6.2 全局快速搜索

文件：`static/app.js`、`static/style.css`、相关业务 JS

顶部搜索框可搜索：

- 项目
- 中心
- PI / CRC 信息
- 待办
- 监查问题
- 伦理递交信

点击结果会跳转或高亮对应对象。

### 6.3 中心驾驶舱

文件：`static/js/centers.js`、`static/js/tasks.js`、`static/js/findings.js`、`static/style.css`

中心详情概览第一屏新增：

- 风险状态
- 资料完整度
- 待办/问题/伦理/方案偏离/证照指标
- PI、CRC、伦理联系卡片
- 一键复制联系方式
- 新建中心待办、录入问题、伦理记录、方案偏离快捷入口

注意：

- `showAddTaskForCenter(centerId)` 在 `tasks.js`
- `openNewFindingForm(preset)` 支持 `{ project_id, center_id }` 预选
- `copyCenterText` 使用剪贴板 API，失败时会 toast 提示

### 6.4 项目驾驶舱

文件：`static/js/projects.js`、`static/style.css`

项目详情第一屏新增：

- 项目风险状态
- 进行中待办、逾期待办、未关闭问题、逾期问题、Critical 问题、距离 DBL
- 里程碑完成进度
- 重点中心列表，按问题/待办/逾期里程碑排序
- 下一步建议
- 快捷入口：新建待办、录入问题、添加中心、查看问题

实现注意：

- `viewProject(projectId)` 现在一次并行拉取项目、中心、待办、问题
- `renderProjectCockpit(...)` 只负责生成项目驾驶舱 HTML
- `renderProjectTasks(tasks)` 支持直接渲染已加载任务，并按未完成、截止日期、优先级排序

---

## 7. Supabase 信息

连接信息硬编码在：

```text
static/js/supabase-client.js
```

当前项目使用 Supabase publishable key，前端公开。RLS 当前是内部工具式开放策略。

重要提醒：

- 任何拿到 URL 和 key 的人理论上都可能读写数据
- 如果未来要多人权限、登录、审计，需要重做 RLS 和认证
- 目前所有前端 ID 多由 JS 生成随机字符串

常见 API：

| API | 用途 |
|---|---|
| `api.getProjects()` | 项目列表，附带 center/task 统计 |
| `api.getProject(id)` | 单项目详情 |
| `api.getCenters(projectId)` | 某项目中心列表，附带任务/问题统计 |
| `api.getCenter(centerId)` | 单中心详情 |
| `api.getTasks(filters)` | 待办列表，可按 project_id / center_id 过滤 |
| `api.getFindings(filters)` | 监查问题，可按 project_id / center_id 过滤 |
| `api.getEthics(centerId)` | 中心伦理记录 |
| `api.getPDs(centerId)` | 中心方案偏离 |
| `api.getEthicsLetters(filters)` | 伦理递交信记录 |

---

## 8. 重要注意事项

### 8.1 `center_count` 不是数据库字段

`center_count` 是读取项目列表时计算出来的字段，不能在保存项目时写回 Supabase。

如果保存项目时报：

```text
PGRST204 center_count
```

说明 payload 里混入了计算字段，需要过滤。

### 8.2 继续保持无框架

当前项目没有构建工具。除非明确决定重构，否则不要引入 React/Vue/Vite，否则部署流程会变复杂。

推荐继续使用：

- 原生 JS
- `window.xxx = function() {}` 全局函数
- 模板字符串拼 HTML
- `window.api.xxx()` 调 Supabase

### 8.3 HTML 转义必须谨慎

用户数据插入 HTML 时使用：

- `window.escHtml(value)`：普通文本内容
- `window.escAttr(value)`：HTML 属性值

如果把字符串放进内联 `onclick`，优先用 `JSON.stringify` 再转义，避免电话、地址、备注中的引号或换行打断 JS。

### 8.4 中文在 Windows 终端可能乱码

Windows PowerShell 输出中文时可能显示乱码，但文件本身是 UTF-8。

Mac 上通常不会有这个问题。若要确认文件内容，使用：

```bash
python3 - <<'PY'
from pathlib import Path
print(Path('static/js/projects.js').read_text(encoding='utf-8')[:500])
PY
```

### 8.5 Word 递交信模板不要从零创建

伦理递交信功能依赖公司原始 Word 模板格式。

不要用 python-docx 从零生成模板，否则会丢页眉 Logo、页脚版本、字体和排版。应基于原始 `.docx` 替换占位符。

关键逻辑在：

```text
static/js/ethics.js
```

---

## 9. 出差期间推荐维护节奏

建议每次只做一类小改动：

1. 明确要优化的流程
2. 先读相关 JS 文件
3. 小范围改动
4. 跑 JS 语法检查
5. 提交 `main`
6. 同步 `gh-pages`
7. 打开线上页面实际体验

推荐提交格式：

```bash
feat: add xxx
fix: improve xxx
refactor: simplify xxx
deploy: add xxx
```

---

## 10. 后续实用功能建议

按实用性排序：

1. **递交信生成体验优化**
   - 表单拆成“基本信息 / 文件清单 / 生成预览”三步
   - 增加模板字段完整性检查
   - 生成前显示缺失字段提示

2. **任务批量处理**
   - 多选待办
   - 批量改截止日期、优先级、状态
   - 批量关联中心

3. **监查问题跟进增强**
   - 增加“下一次跟进日期”
   - 增加 CRC 回复记录
   - 问题列表按逾期、Critical、中心分组

4. **中心联系人增强**
   - PI / CRC / 伦理联系人支持多联系人
   - 一键复制完整联系信息
   - 电话、邮箱、地址分字段维护

5. **数据质量检查页**
   - 哪些项目缺 DBL
   - 哪些中心缺 PI / CRC / 伦理联系人
   - 哪些问题缺整改截止日
   - 哪些伦理记录缺批准日期

6. **物资管理模块**
   - 物资清单
   - 物资发放/回收记录
   - Word 物资交接单生成

7. **财务管理模块**
   - 协议金额
   - 伦理费付款
   - 发票状态
   - 到账和催办提醒

---

## 11. 常用排查命令

```bash
# 看当前分支和改动
git branch --show-current
git status --short

# 看最近提交
git log --oneline -8

# 检查 JS
node --check static/app.js
find static/js -name '*.js' -print0 | xargs -0 -n1 node --check

# 检查空白问题
git diff --check

# 看 main 与 gh-pages 最近提交
git log --oneline main -5
git log --oneline gh-pages -5

# 部署后回 main
git checkout main
```

---

## 12. 当前可靠基线

截至 2026-07-06，以下状态可作为 Mac 维护基线：

- `main` 最新：`d1b450c feat: add project cockpit overview`
- `gh-pages` 最新：`feae40b deploy: add project cockpit overview`
- 全量 JS 语法检查已通过
- `git diff --check` 已通过
- 线上地址已部署到 GitHub Pages

线上地址：

```text
https://zhuyiyue.github.io/cra-portal/
```

---

## 13. 交接给未来 Codex 的一句话

这个项目最重要的是保持“CRA 日常工作流”的实用性：优先减少查找、复制、重复录入、人工判断风险的时间。每次优化都应该围绕项目、中心、待办、问题、伦理递交这几条主线，让页面更像一个能直接开工的工作台，而不是只做展示。