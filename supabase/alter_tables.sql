-- CRA Portal 表结构补全脚本
-- 在 Supabase SQL Editor 中运行此脚本，添加缺失的列

-- 1. projects 表 - 补全列
ALTER TABLE projects ADD COLUMN IF NOT EXISTS code TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS dbl_date TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. centers 表（如果不存在则创建）
CREATE TABLE IF NOT EXISTS centers (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    code TEXT DEFAULT '',
    name TEXT NOT NULL,
    department TEXT DEFAULT '',
    address TEXT DEFAULT '',
    pi_name TEXT DEFAULT '',
    pi_phone TEXT DEFAULT '',
    pi_email TEXT DEFAULT '',
    contact_crc TEXT DEFAULT '',
    contact_crc_phone TEXT DEFAULT '',
    contact_ethics TEXT DEFAULT '',
    milestones JSONB DEFAULT '{}'::jsonb,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_centers_project_id ON centers(project_id);

-- 3. tasks 表（如果不存在则创建）
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    center_id TEXT REFERENCES centers(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'medium',
    ability_type TEXT DEFAULT 'execution',
    due_date TEXT DEFAULT '',
    done BOOLEAN DEFAULT FALSE,
    task_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_center_id ON tasks(center_id);

-- 4. findings 表（如果不存在则创建）
CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    center_id TEXT REFERENCES centers(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_findings_project_id ON findings(project_id);
CREATE INDEX IF NOT EXISTS idx_findings_center_id ON findings(center_id);

-- 5. ethics_submissions 表（如果不存在则创建）
CREATE TABLE IF NOT EXISTS ethics_submissions (
    id TEXT PRIMARY KEY,
    center_id TEXT REFERENCES centers(id) ON DELETE CASCADE,
    submission_type TEXT DEFAULT '',
    submission_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. protocol_deviations 表（如果不存在则创建）
CREATE TABLE IF NOT EXISTS protocol_deviations (
    id TEXT PRIMARY KEY,
    center_id TEXT REFERENCES centers(id) ON DELETE CASCADE,
    deviation_type TEXT DEFAULT '',
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'Open',
    report_date TEXT DEFAULT '',
    resolution TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. research_staff 表（如果不存在则创建）
CREATE TABLE IF NOT EXISTS research_staff (
    id TEXT PRIMARY KEY,
    center_id TEXT REFERENCES centers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    gcp_status TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 启用 RLS（Row Level Security）
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethics_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_staff ENABLE ROW LEVEL SECURITY;

-- 允许 anon 角色完全访问（后续可加认证收紧）
CREATE POLICY "Allow anon full access" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access" ON centers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access" ON findings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access" ON ethics_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access" ON protocol_deviations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access" ON research_staff FOR ALL USING (true) WITH CHECK (true);
