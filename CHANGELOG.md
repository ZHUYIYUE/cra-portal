# CHANGELOG

> 记录产品和工程变更。每次完成一个 Story 后补充日期、范围、数据库迁移和部署状态。

## 2026-07-16

### Added

- 新增中心工作事项第一版：以项目和中心为归属，记录完整事项、推进步骤、等待对象、下一步、催办日期和活动记录。
- 新增 6 个场景模板：尾款结算、方案偏离递交伦理、SSU 协议初稿、正常值范围配置、数据清理、预筛选。
- 中心详情新增「工作事项」页签；Dashboard 和全局搜索接入中心事项。
- 新增 `CENTER_WORK_ITEMS_SPEC.md`，明确第一版范围和验收标准。

### Database

- 已在 Supabase 执行并 REST 验证 `supabase/center_work_items.sql`：三张表均可读写；临时验证记录已删除。

### Deployment

- 待部署至 GitHub Pages。

## 2026-07-12

### Added

- 完成中心伦理递交闭环第一版：递交包可持续记录伦理签收、审查方式、会审/快审批件或意见函、备案受理回执。
- 中心详情的「伦理递交」页新增「中心递交包闭环」区域，直接展示并维护该中心的递交包状态、签收/结果和下一步动作。
- Dashboard 新增「伦理待跟进」指标与「伦理闭环」清单，可跳转到对应递交包。

### Changed

- 递交包列表将原文件数量列替换为「签收/结果」，突出伦理闭环进度。
- 从中心伦理页编辑递交包后会回到当前中心并刷新递交包数据，不跳离中心工作上下文。

### Database

- 无新增 SQL。现有 `ethics_submission_packages` 已包含本次使用的签收、审查方式、批件/意见函和备案回执字段。

### Deployment

- 待部署至 GitHub Pages。

## 2026-07-11

### Added

- 递交包详情和列表新增「生成双递交信」入口，可从中心递交包一键生成 `CRA致PI递交信` 与 `PI致伦理递交信` 两条递交信记录。
- 双递交信自动复用递交包中的项目、中心、伦理委员会和递交文件版本快照。
- 生成结果弹窗提供单封查看、单封生成 Word、全部生成 Word 入口。
- 新增培训管理第一版：可从项目文件创建中心级培训计划，并为中心研究人员生成逐人培训记录。
- 新增 `supabase/training_management.sql`，用于创建 `training_plans` 和 `training_records`。
- 新增培训记录/签到表 Word 生成第一版，可从培训计划详情导出可打印签署的 Word 文件。
- Dashboard 新增培训风险和本周到期培训提醒，可直接跳转到培训计划详情。
- 全局搜索新增培训计划索引，可按培训标题、项目、中心和文件版本检索。

### Changed

- 递交包生成递交信后，自动将 `CTA to PI` 与 `PI to EC` 状态从「未生成」推进为「已生成」。
- 重复点击生成时，会识别同一递交包已生成过的递交信，避免重复创建。
- 左侧导航新增「培训管理」模块。
- 培训计划可逐人更新培训状态、培训日期和证据收集状态，并自动汇总计划完成率。
- 培训记录 Word 先采用内置版式生成，包含项目、中心、文件版本、培训对象、签名栏和日期栏；自定义模板后续增强。
- 首页工作台纳入培训计划状态，培训管理从“单独页面”进入日常提醒闭环。

### Database

- 递交包生成双递交信无新增迁移，通过递交信备注中的递交包标识建立轻量关联；后续如需更严谨追踪可再为 `ethics_letters` 增加 `package_id` 字段。
- 已在 Supabase 执行 `supabase/training_management.sql`，并通过 REST 验证 `training_plans`、`training_records` 表可读。

### Deployment

- 已部署至 GitHub Pages。

## 2026-07-09

### Added

- 新增 `VISION.md`，明确 CRA Portal 向 CRA OS / AI Clinical Operations Workspace 演进。
- 新增 `PRODUCT_BACKLOG.md`，按 Epic / Story 拆分 Dashboard、待办、中心、递交信、物资、财务和 AI 能力。
- 新增 `AGENTS.md`，约束后续 Codex / AI 开发流程和工程边界。
- 新增 `ETHICS_WORKFLOW_SPEC.md`，记录真实伦理递交流程，并将模块设计从“递交信”升级为“伦理递交包”。
- 新增 `CROSS_MODULE_INTEGRATION_SPEC.md`，明确项目文件库、伦理递交包和财务伦理费的打通关系。
- 新增 `TRAINING_WORKFLOW_SPEC.md`，定义项目文件触发授权研究人员培训、培训计划和培训完成追踪。
- 新增项目文件库第一版：项目详情页可登记文件类型、名称、版本、版本日期、接收日期、伦理递交标记和培训标记。
- 新增 `supabase/project_documents.sql`，用于创建 `project_documents` 表。
- 项目详情页新增「项目文件」快捷入口，并给静态资源加版本号，避免浏览器继续使用旧缓存。
- 新增中心伦理递交包骨架：同一项目文件可按不同中心分别追踪递交状态、审查方式、签收/批件/回执和费用状态。
- 新增 `supabase/ethics_submission_packages.sql`，用于创建中心递交包和递交包文件快照表。

### Changed

- 更新 `README.md`，加入产品方向文档入口。
- 更新 `PRODUCT_BACKLOG.md`，将递交信 Epic 拆分为递交包状态追踪、双递交信绑定、伦理签收/审查结果、财务联动。
- 更新 `ETHICS_WORKFLOW_SPEC.md`，补充递交文件来自项目文件库、会审/快审费用进入财务模块的原则。
- 更新 `CROSS_MODULE_INTEGRATION_SPEC.md`，加入项目文件与人员培训管理的联动关系。
- 更新 `TRAINING_WORKFLOW_SPEC.md` 和 `PRODUCT_BACKLOG.md`，补充培训记录/签到表 Word 生成及签署证据收集。
- 更新 `PRODUCT_BACKLOG.md`，明确项目文件是项目级主数据，递交和培训进度必须是中心级/人员级数据。

### Database

- 已在 Supabase 执行 `supabase/project_documents.sql`，并通过 REST 验证 `project_documents` 表可读。
- 已在 Supabase 执行 `supabase/ethics_submission_packages.sql`，用于保存中心级递交包和递交文件版本快照。

### Deployment

- 中心递交包功能已部署至 GitHub Pages。
