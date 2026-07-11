-- ========== 培训管理 ==========
-- 项目文件是项目级主数据；培训计划和培训完成情况是中心级/人员级进度。
-- 同一份项目文件在不同中心、不同授权研究人员之间可以有不同培训状态。

CREATE TABLE IF NOT EXISTS training_plans (
    id TEXT PRIMARY KEY,
    project_id TEXT DEFAULT '',
    center_id TEXT DEFAULT '',
    project_document_id TEXT DEFAULT '',
    title TEXT DEFAULT '',
    training_type TEXT DEFAULT '其他',
    scope TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    status TEXT DEFAULT '进行中',
    doc_category_snapshot TEXT DEFAULT '',
    doc_name_snapshot TEXT DEFAULT '',
    version_snapshot TEXT DEFAULT '',
    version_date_snapshot TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_records (
    id TEXT PRIMARY KEY,
    training_plan_id TEXT DEFAULT '',
    project_id TEXT DEFAULT '',
    center_id TEXT DEFAULT '',
    staff_id TEXT DEFAULT '',
    staff_name_snapshot TEXT DEFAULT '',
    staff_role_snapshot TEXT DEFAULT '',
    required BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT '未开始',
    training_date TEXT DEFAULT '',
    evidence_collected BOOLEAN DEFAULT FALSE,
    evidence_file_path TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    CREATE POLICY "cra_training_plans_all"
    ON training_plans
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "cra_training_records_all"
    ON training_records
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_training_plans_project ON training_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_center ON training_plans(center_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_document ON training_plans(project_document_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_status ON training_plans(status);
CREATE INDEX IF NOT EXISTS idx_training_records_plan ON training_records(training_plan_id);
CREATE INDEX IF NOT EXISTS idx_training_records_staff ON training_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_training_records_status ON training_records(status);
