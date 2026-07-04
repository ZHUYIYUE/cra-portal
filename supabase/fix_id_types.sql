-- 修复 tasks 和 findings 表的 ID 类型问题
-- 在 Supabase SQL Editor 中运行

-- 1. 重建 tasks 表（id 需要是 TEXT）
DROP TABLE IF EXISTS tasks CASCADE;
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    project_id TEXT DEFAULT '',
    center_id TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    ability_type TEXT DEFAULT 'execution',
    due_date TEXT DEFAULT '',
    done BOOLEAN DEFAULT FALSE,
    task_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_center ON tasks(center_id);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "cra_tasks_all" ON tasks FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. 重建 findings 表（id 需要是 TEXT，且缺 project_id 等列）
DROP TABLE IF EXISTS findings CASCADE;
CREATE TABLE findings (
    id TEXT PRIMARY KEY,
    project_id TEXT DEFAULT '',
    center_id TEXT DEFAULT '',
    category TEXT DEFAULT '',
    description TEXT NOT NULL,
    severity TEXT DEFAULT 'Minor',
    status TEXT DEFAULT 'Open',
    found_date TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    corrective_action TEXT DEFAULT '',
    finding_number TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_findings_project ON findings(project_id);
CREATE INDEX IF NOT EXISTS idx_findings_center ON findings(center_id);
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "cra_findings_all" ON findings FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
