# CRA Portal 项目交接文档

> 本文档供接手开发（CodeX / 其他AI / 人类开发者）快速了解项目全貌。
> 最后更新：2026-07-05

---

## 一、项目背景

**CRA Portal**（临床研究助理管理中心）是一套面向临床试验 CRA（Clinical Research Associate）日常工作管理的 Web 应用。

用户是制药公司/CRO 的 CRA 人员，需要管理多中心临床试验项目的日常事务，包括：项目进度跟踪、中心信息管理、伦理递交信自动生成、待办事项、监查问题（Findings）追踪等。

**核心价值**：将 CRA 分散在 Excel / 微信 / 纸质文件中的日常工作数字化集中管理，并**自动生成符合公司模板格式的 Word 递交信**，减少重复手工操作。

---

## 二、线上地址 & 仓库

| 项目 | 地址 |
|------|------|
| **线上站点** | https://zhuyiyue.github.io/cra-portal/ |
| **GitHub 仓库** | https://github.com/ZHUYIYUE/cra-portal |
| **本地路径** | `D:\办公\项目\cra-portal` |
| **Word模板目录** | `D:\办公\项目\`（模板构建脚本也在此） |

---

## 三、技术栈

```
┌─────────────────────────────────────────────┐
│              浏览器（用户端）                  │
│  纯静态 HTML + CSS + 原生 JavaScript          │
│  无框架（非 Vue/React），无构建工具            │
├─────────────────────────────────────────────┤
│         CDN 依赖                              │
│  • Supabase JS（通过 REST API 直连）          │
│  • SheetJS (xlsx) — Excel 导出               │
│  • docxtemplater + PizZip — Word 模板填充    │
│  • FileSaver.js — 浏览器端文件下载            │
│  • Font Awesome — 图标                        │
├─────────────────────────────────────────────┤
│         Supabase（BaaS 后端）                 │
│  • PostgreSQL 数据库（PostgREST API 直连）    │
│  • Storage（存储 Word 模板文件）              │
│  • Row Level Security（全部开放 anon 访问）   │
├─────────────────────────────────────────────┤
│         GitHub Pages（静态托管）              │
│  • main 分支 → 源码                           │
│  • gh-pages 分支 → 部署的静态文件              │
└─────────────────────────────────────────────┘
```

### 架构特点

- **无独立后端服务器**：前端 JS 直接通过 Supabase PostgREST API 读写数据库，无需自建 API 层
- **无构建步骤**：修改 HTML/JS/CSS 后直接 push 到 gh-pages 即可部署
- **anon key 公开**：Supabase 使用 publishable key（非 secret key），RLS 策略全部设为 `USING (true)`，适合内部工具场景

> ⚠️ **安全提示**：当前 RLS 全开放，任何拿到 URL+Key 的人都能读写数据。如果未来需要多用户权限控制，需要重新设计 RLS 策略。

---

## 四、Supabase 配置

```
Supabase URL:  https://ospnktbwlbsdveawrkzd.supabase.co
Publishable Key: sb_publishable_KlAaxgwXGH5u4833Zdd1OQ_c_2gI6vD
Storage Bucket: templates（公开读取，存储 Word 模板）
```

> 以上信息硬编码在 `static/js/supabase-client.js` 第 4-5 行。

---

## 五、数据库结构

所有表使用 `TEXT` 类型主键（前端 JS 生成 12 位 hex 随机 ID），时间戳用 `TIMESTAMPTZ`。

### 核心业务表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| **projects** | 项目 | name, code, full_name, approval_number, sponsor, cro_name, stage, dbl_date |
| **centers** | 研究中心 | project_id(FK), code, name, pi_name, pi_phone, ethics_committee_name |
| **tasks** | 待办事项 | project_id(FK), center_id, title, priority, ability_type, due_date, done |
| **findings** | 监查问题 | project_id(FK), center_id, category, description, severity, status |
| **ethics_letters** | 伦理递交信批次 | project_id, center_id, letter_type, submission_date, submitter_name |
| **ethics_letter_items** | 递交信文件清单 | letter_id(FK), doc_type, doc_name, version, version_date, copies |
| **ethics_templates** | Word模板元数据 | name, file_path, letter_type, is_default |
| **startup_tasks** | 启动任务清单 | name, description, done |
| **startup_logs** | 启动任务执行日志 | task_id, project_id, center_id, calmness_before/after |

### 建表 SQL

- 基础表：`supabase/schema.sql`
- 伦理递交增强：`supabase/ethics_enhanced.sql`（建 ethics_letters 等三张表）
- 双模板字段补齐：`supabase/ethics_enhanced_v2.sql`（ALTER TABLE 加 full_name/letter_type 等）

> **以上 SQL 均已在 Supabase 执行完毕**，新环境部署时按顺序执行即可。

### 注意事项

- `center_count` 是**计算字段**（从 centers 表统计），不是数据库列，保存项目时**不能传给 Supabase**，否则报 `PGRST204` 错误
- 所有表的 RLS 策略都是 `FOR ALL USING (true) WITH CHECK (true)`，完全开放
- Storage bucket `templates` 也是公开读写

---

## 六、代码结构

```
cra-portal/
├── index.html                    # 入口页面，加载所有 JS/CSS
├── static/
│   ├── style.css                 # 全局样式（1068行）
│   ├── app.js                    # 应用入口、路由、全局状态
│   └── js/
│       ├── supabase-client.js    # ★ API 层：所有数据库操作（911行）
│       ├── dashboard.js          # 总览页
│       ├── projects.js           # 项目管理（新建/编辑/详情）
│       ├── centers.js            # 中心管理（里程碑/待办/问题）
│       ├── tasks.js              # 待办事项（日历视图）
│       ├── findings.js           # 监查问题追踪
│       ├── ethics.js             # ★ 伦理递交（双模板Word生成）
│       └── utils.js              # 工具函数（modal/toast/日期）
├── supabase/                     # SQL 脚本（已执行）
│   ├── schema.sql                # 基础建表
│   ├── ethics_enhanced.sql       # 伦理递交表
│   └── ethics_enhanced_v2.sql    # 双模板字段补齐
├── .gitattributes                # Mac/Windows 跨平台换行规则
├── deploy.bat                    # 部署脚本（当前路径已指向 D 盘）
└── legacy-flask/                 # 旧版 Flask/JSON 实现归档，仅作历史参考
```

### 代码风格约定

- **原生 JavaScript**：当前代码已使用 `const/let`、箭头函数、模板字符串和 `async/await`，继续保持无框架、无构建工具即可
- **全局函数挂载**：所有页面函数挂载到 `window` 上（如 `window.loadEthics`），HTML 中通过 `onclick` 调用
- **无模块系统**：所有 JS 通过 `<script>` 标签顺序加载，共享全局 `window.api` 对象
- **API 统一入口**：所有数据库操作通过 `window.api.xxx()` 调用，定义在 `supabase-client.js`
- **跨平台换行**：项目曾在 Mac 上开发，Windows 接手后已加入 `.gitattributes`，固定 JS/CSS/HTML/SQL/Markdown 为 LF，`.bat`/`.cmd`/`.ps1` 为 CRLF

---

## 七、已完成功能模块

### 1. 总览（Dashboard）
- 项目数量、中心数量、待办统计、问题统计
- 近期待办日历视图

### 2. 项目管理
- 新建/编辑/删除项目
- 字段：项目简称、项目全称、项目编号、通知书编号、申办方、CRO名称、阶段、DBL日期
- 项目详情页关联展示中心、待办、问题

### 3. 中心管理
- 新建/编辑/删除中心
- 字段：中心编号、医院名称、科室、PI信息、CRC信息、伦理委员会名称
- 里程碑跟踪（JSONB 存储）
- 中心详情多 Tab：概览/待办/问题/伦理递交

### 4. 待办事项
- 按项目/中心/能力类型分类
- 优先级（高/中/低）
- 日历视图
- Excel 导出

### 5. 监查问题（Findings）
- 严重程度分类（Major/Minor/Critical）
- 状态流转（Open→In Progress→Closed）
- 纠正措施记录

### 6. 伦理递交管理 ★核心功能
- **双模板架构**：
  - `CRA_to_PI`：CRA 致 PI 递交信
  - `PI_to_Ethics`：PI 致伦理委员会递交信
- 在线填写递交信息 + 文件清单
- 一键生成 Word 递交信（基于公司标准模板，保留页眉 Logo 和页脚版本号）
- 递交信记录管理（按项目/中心筛选）

#### Word 模板生成原理

```
用户填写表单 → JS 组装数据 → 从 Supabase Storage 下载 .docx 模板
→ PizZip 解压 → docxtemplater 替换占位符 → 生成新 .docx → FileSaver 下载
```

**模板占位符**：
- CRA致PI：`{center_name}` `{pi_name}` `{sponsor}` `{project_full_name}` `{project_code}` `{approval_number}` `{today_date}` + `{#docs}...{/docs}` 文件循环
- PI致伦理：`{ethics_committee}` `{sponsor}` `{project_full_name}` `{project_code}` `{approval_number}` `{today_date}` + 文件循环

**模板文件**（已上传 Supabase Storage）：
- 路径：`templates/ethics-letters/tmpl_cra_to_pi_v2/CRA_to_PI_template.docx`
- 路径：`templates/ethics-letters/tmpl_pi_to_ethics_v2/PI_to_Ethics_template.docx`
- 本地备份：`D:\办公\项目\CRA_to_PI_template_v2.docx` / `PI_to_Ethics_template_v2.docx`

> ⚠️ Word 模板必须基于**原始 .docx 转换文件**操作（保留页眉 Logo / 页脚版本号 / 字体样式），**不能从零用 python-docx 创建**，否则会丢失所有格式。

---

## 八、待开发模块

### 物资管理
- 需求：自动生成 Word 版物资交接单
- 参考：伦理递交的 Word 生成逻辑（docxtemplater）
- 需要新建：物资表、物资交接记录表、物资交接单 Word 模板

### 财务管理
- 需求：协议费用管理、伦理审查打款记录、发票追踪
- 需要新建：协议费用表、付款记录表、发票表
- 可能需要：发票图片上传（Supabase Storage）

---

## 九、部署流程

### 方式一：deploy.bat

当前 `deploy.bat` 已指向 `D:\办公\项目\cra-portal`。使用前仍需确认本机 `git` 命令可用，并检查工作区没有未确认的临时文件。

部署逻辑：
1. `git checkout main` → 提交代码到 main 分支
2. `git checkout gh-pages` → 从 main 拷贝 `index.html` 和 `static/` 到 gh-pages
3. `git push origin gh-pages` → 推送触发 GitHub Pages 自动构建
4. 约 1-2 分钟后生效

### 方式二：手动部署

```bash
cd "D:\办公\项目\cra-portal"

# 1. 提交到 main
git add -A
git commit -m "update: 功能描述"
git push origin main

# 2. 同步到 gh-pages
git checkout gh-pages
git checkout main -- index.html static
git add -A
git commit -m "deploy: 功能描述"
git push origin gh-pages

# 3. 切回 main
git checkout main
```

### GitHub Pages 构建问题

如果 push 后页面没更新，可能是构建卡住。手动触发：

```bash
curl -X POST -H "Authorization: token <GITHUB_TOKEN>" \
  "https://api.github.com/repos/ZHUYIYUE/cra-portal/pages/builds"
```

查询构建状态：

```bash
curl -H "Authorization: token <GITHUB_TOKEN>" \
  "https://api.github.com/repos/ZHUYIYUE/cra-portal/pages"
# 看 "status": "built" 表示完成
```

---

## 十、已知问题 & 修复记录

### 已修复

| 问题 | 原因 | 修复方案 |
|------|------|----------|
| 项目保存报错 `PGRST204 center_count` | `center_count` 是计算字段，不在数据库中 | 保存时去掉 `center_count`，只在读取时动态计算 |
| Word 递交信格式全变 | 用 python-docx 从零创建丢失了页眉/页脚/样式 | 基于原始 .docx 文件操作，只替换标黄文本为占位符 |
| 字段显示 `undefined` | 模板占位符与前端数据 key 不匹配 | 统一占位符命名，确保 API 返回数据 key 一致 |
| `getCenters` 传参错误 | 传了对象 `{project_id: x}`，API 期望字符串 | 改为 `api.getCenters(projId)` |
| CDN 链接 404 | bootcdn 的 pizzip/docxtemplater 链接失效 | 换为 jsdelivr CDN |
| GitHub Pages 构建卡住 | Pages 偶发性构建卡顿 | 手动 POST `/pages/builds` 触发重建 |
| 伦理模板 letter_type 字段缺失 | ethics_templates 表初始没有此列 | 执行 ethics_enhanced_v2.sql 补齐 |

### 注意事项

1. **deploy.bat 路径已更新**：当前硬编码为 `D:\办公\项目\cra-portal`；后续迁移目录时再调整
2. **git remote 已脱敏**：当前 remote 为普通 HTTPS 地址；历史上曾嵌入 GitHub personal access token，建议在 GitHub 侧轮换/吊销旧 token
3. **旧代码已归档**：旧版 Flask/JSON 实现已移动到 `legacy-flask/`，当前架构不使用，仅保留作历史参考
4. **文件名乱码**：重复的乱码文件 `閮ㄧ讲鎸囧崡.md` 已归档到 `legacy-flask/`；根目录保留正常的 `部署指南.md`
5. **旧部署文档已归档**：Render/Flask 时代的 `部署指南`、`迁移指南` 已移入 `legacy-flask/`；根目录 `部署指南.md` 是当前 GitHub Pages 流程

---

## 十一、开发约定

1. **新增表**：在 `supabase/` 下新建 SQL 文件，包含建表 + RLS 策略 + 索引
2. **新增页面**：在 `index.html` 侧边栏加导航项 → 新建 `static/js/xxx.js` → 在 `index.html` 底部加载
3. **API 层**：所有数据库操作写在 `supabase-client.js` 的 `window.api` 对象中
4. **Word 生成**：复用伦理递交的 docxtemplater 方案，上传模板到 Storage → 前端下载填充
5. **原生 JS 风格**：可使用现有现代语法，但不引入构建工具；所有页面函数仍挂载到 `window`
6. **提交规范**：`feat:` / `fix:` / `deploy:` / `refactor:` 前缀

---

## 十二、关键文件速查

| 需要做什么 | 看哪个文件 |
|-----------|-----------|
| 改数据库连接配置 | `static/js/supabase-client.js` 第 4-5 行 |
| 加新页面/导航 | `index.html` + `static/js/xxx.js` |
| 改项目表单字段 | `static/js/projects.js` |
| 改伦理递交逻辑 | `static/js/ethics.js` |
| 改 Word 模板 | `D:\办公\项目\build_templates.py`（重建模板） |
| 上传 Word 模板 | `D:\办公\项目\upload_templates.py` |
| 查看数据库建表语句 | `supabase/schema.sql` + `supabase/ethics_enhanced*.sql` |
| 部署 | `deploy.bat` 或手动 git 操作 |

---

## 十三、Word 模板重建流程（如需修改模板内容）

1. 准备原始 .doc 模板文件（公司提供）
2. 用 Word COM 转 .docx：`build_templates.py` 中的转换逻辑（需 Windows + Word）
3. 运行 `build_templates.py`：基于转换后的 .docx，将标黄文本替换为 docxtemplater 占位符
4. 运行 `upload_templates.py`：上传到 Supabase Storage 并更新 `ethics_templates` 表
5. 前端即可使用新模板

> 脚本位置：`D:\办公\项目\build_templates.py`、`D:\办公\项目\upload_templates.py`
> 依赖：python-docx（安装到 Python 隔离环境）

---

*文档结束。如有疑问，可参考项目记忆文件 `.workbuddy/memory/MEMORY.md`。*
