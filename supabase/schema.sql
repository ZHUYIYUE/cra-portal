-- CRA Portal - Supabase 数据库迁移脚本
-- 在 Supabase SQL Editor 中运行此文件

-- ========== 1. 项目表 ==========
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    stage TEXT DEFAULT '',
    center_count INTEGER DEFAULT 0,
    dbl_date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 2. 中心表 ==========
CREATE TABLE IF NOT EXISTS centers (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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
    milestones JSONB DEFAULT '{}',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 3. 待办事项表 ==========
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    center_id TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    ability_type TEXT DEFAULT 'execution',
    due_date TEXT DEFAULT '',
    done BOOLEAN DEFAULT FALSE,
    task_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 4. 监查问题表 ==========
CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    center_id TEXT DEFAULT '',
    category TEXT DEFAULT '',
    description TEXT NOT NULL,
    severity TEXT DEFAULT 'Minor',
    status TEXT DEFAULT 'Open',
    found_date TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    corrective_action TEXT DEFAULT '',
    finding_number TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 5. 伦理递交表 ==========
CREATE TABLE IF NOT EXISTS ethics_submissions (
    id TEXT PRIMARY KEY,
    center_id TEXT NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    submission_date TEXT DEFAULT '',
    approval_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 6. 方案偏离表 ==========
CREATE TABLE IF NOT EXISTS protocol_deviations (
    id TEXT PRIMARY KEY,
    center_id TEXT NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    subject_id TEXT DEFAULT '',
    description TEXT NOT NULL,
    deviation_date TEXT DEFAULT '',
    reported_date TEXT DEFAULT '',
    status TEXT DEFAULT 'Open',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 7. 研究人员表 ==========
CREATE TABLE IF NOT EXISTS research_staff (
    id TEXT PRIMARY KEY,
    center_id TEXT NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT DEFAULT '',
    gcp_cert TEXT DEFAULT '',
    gcp_expiry TEXT DEFAULT '',
    cv_date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 8. 启动任务表 ==========
CREATE TABLE IF NOT EXISTS startup_tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 索引 ==========
CREATE INDEX IF NOT EXISTS idx_centers_project ON centers(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_center ON tasks(center_id);
CREATE INDEX IF NOT EXISTS idx_findings_project ON findings(project_id);
CREATE INDEX IF NOT EXISTS idx_findings_center ON findings(center_id);
CREATE INDEX IF NOT EXISTS idx_ethics_center ON ethics_submissions(center_id);
CREATE INDEX IF NOT EXISTS idx_deviations_center ON protocol_deviations(center_id);
CREATE INDEX IF NOT EXISTS idx_staff_center ON research_staff(center_id);

-- ========== 更新时间触发器 ==========
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER IF NOT EXISTS centers_updated_at BEFORE UPDATE ON centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER IF NOT EXISTS findings_updated_at BEFORE UPDATE ON findings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
