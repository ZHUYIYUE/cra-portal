# CHANGELOG

> 记录产品和工程变更。每次完成一个 Story 后补充日期、范围、数据库迁移和部署状态。

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
