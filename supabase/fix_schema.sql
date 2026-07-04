-- CRA Portal 表结构修复脚本
-- 在 Supabase SQL Editor 中运行

-- 1. projects 表 - 添加缺失列
ALTER TABLE projects ADD COLUMN IF NOT EXISTS code TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS dbl_date TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. centers 表 - 添加缺失列
ALTER TABLE centers ADD COLUMN IF NOT EXISTS code TEXT DEFAULT '';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS department TEXT DEFAULT '';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS pi_name TEXT DEFAULT '';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS pi_phone TEXT DEFAULT '';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS pi_email TEXT DEFAULT '';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS contact_crc TEXT DEFAULT '';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS contact_crc_phone TEXT DEFAULT '';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS contact_ethics TEXT DEFAULT '';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '{}'::jsonb;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. tasks 表 - 添加缺失列
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ability_type TEXT DEFAULT 'execution';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_status TEXT DEFAULT 'pending';

-- 4. findings 表 - 添加缺失列
ALTER TABLE findings ADD COLUMN IF NOT EXISTS project_id TEXT DEFAULT '';
ALTER TABLE findings ADD COLUMN IF NOT EXISTS found_date TEXT DEFAULT '';
ALTER TABLE findings ADD COLUMN IF NOT EXISTS corrective_action TEXT DEFAULT '';
ALTER TABLE findings ADD COLUMN IF NOT EXISTS finding_number TEXT DEFAULT '';
ALTER TABLE findings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 5. 新建 ethics_submissions 表
CREATE TABLE IF NOT EXISTS ethics_submissions (
    id TEXT PRIMARY KEY,
    center_id TEXT REFERENCES centers(id) ON DELETE CASCADE,
    project_id TEXT DEFAULT '',
    item_name TEXT DEFAULT '',
    submission_type TEXT DEFAULT '',
    submission_date TEXT DEFAULT '',
    approval_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 新建 protocol_deviations 表
CREATE TABLE IF NOT EXISTS protocol_deviations (
    id TEXT PRIMARY KEY,
    center_id TEXT REFERENCES centers(id) ON DELETE CASCADE,
    project_id TEXT DEFAULT '',
    subject_id TEXT DEFAULT '',
    deviation_type TEXT DEFAULT '',
    description TEXT DEFAULT '',
    deviation_date TEXT DEFAULT '',
    reported_date TEXT DEFAULT '',
    status TEXT DEFAULT 'Open',
    resolution TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 新建 research_staff 表
CREATE TABLE IF NOT EXISTS research_staff (
    id TEXT PRIMARY KEY,
    center_id TEXT REFERENCES centers(id) ON DELETE CASCADE,
    project_id TEXT DEFAULT '',
    name TEXT NOT NULL,
    role TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    gcp_status TEXT DEFAULT '',
    gcp_cert TEXT DEFAULT '',
    gcp_expiry TEXT DEFAULT '',
    cv_date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. 新建 startup_tasks 表
CREATE TABLE IF NOT EXISTS startup_tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. 索引
CREATE INDEX IF NOT EXISTS idx_centers_project ON centers(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_center ON tasks(center_id);
CREATE INDEX IF NOT EXISTS idx_findings_project ON findings(project_id);
CREATE INDEX IF NOT EXISTS idx_findings_center ON findings(center_id);

-- 10. 启用 RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethics_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_staff ENABLE ROW LEVEL SECURITY;

-- 11. RLS 策略（用 DO 块避免重复创建报错）
DO $$ BEGIN
    CREATE POLICY "cra_projects_all" ON projects FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "cra_centers_all" ON centers FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "cra_tasks_all" ON tasks FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "cra_findings_all" ON findings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "cra_ethics_all" ON ethics_submissions FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "cra_deviations_all" ON protocol_deviations FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "cra_staff_all" ON research_staff FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
