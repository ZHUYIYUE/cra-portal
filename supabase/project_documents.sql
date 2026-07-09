-- ========== 项目文件库 ==========
-- 项目层面文件主数据：文件类型、名称、版本、伦理递交标记、培训标记。
-- 在 Supabase SQL Editor 执行一次即可。

CREATE TABLE IF NOT EXISTS project_documents (
    id TEXT PRIMARY KEY,
    project_id TEXT DEFAULT '',
    doc_category TEXT DEFAULT '',
    doc_name TEXT DEFAULT '',
    version TEXT DEFAULT '',
    version_date TEXT DEFAULT '',
    effective_date TEXT DEFAULT '',
    received_date TEXT DEFAULT '',
    requires_ethics_submission BOOLEAN DEFAULT FALSE,
    requires_training BOOLEAN DEFAULT FALSE,
    training_scope TEXT DEFAULT '',
    training_due_days INTEGER DEFAULT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    CREATE POLICY "cra_project_documents_all"
    ON project_documents
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_project_documents_project ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_ethics ON project_documents(requires_ethics_submission);
CREATE INDEX IF NOT EXISTS idx_project_documents_training ON project_documents(requires_training);
