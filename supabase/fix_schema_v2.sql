-- CRA Portal Schema Fix v2
-- 在 Supabase SQL Editor 中运行此脚本
-- 补齐前端所需的所有缺失列

-- ========== 1. research_staff 补齐列 ==========
ALTER TABLE research_staff ADD COLUMN IF NOT EXISTS initials TEXT DEFAULT '';
ALTER TABLE research_staff ADD COLUMN IF NOT EXISTS auth_date TEXT DEFAULT '';
ALTER TABLE research_staff ADD COLUMN IF NOT EXISTS cv_collected BOOLEAN DEFAULT FALSE;
ALTER TABLE research_staff ADD COLUMN IF NOT EXISTS cv_date TEXT DEFAULT '';
ALTER TABLE research_staff ADD COLUMN IF NOT EXISTS gcp_collected BOOLEAN DEFAULT FALSE;
ALTER TABLE research_staff ADD COLUMN IF NOT EXISTS gcp_date TEXT DEFAULT '';
ALTER TABLE research_staff ADD COLUMN IF NOT EXISTS license_collected BOOLEAN DEFAULT FALSE;
ALTER TABLE research_staff ADD COLUMN IF NOT EXISTS license_date TEXT DEFAULT '';

-- ========== 2. ethics_submissions 补齐列 ==========
ALTER TABLE ethics_submissions ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT '';
ALTER TABLE ethics_submissions ADD COLUMN IF NOT EXISTS doc_name TEXT DEFAULT '';
ALTER TABLE ethics_submissions ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '';
ALTER TABLE ethics_submissions ADD COLUMN IF NOT EXISTS version_date TEXT DEFAULT '';
ALTER TABLE ethics_submissions ADD COLUMN IF NOT EXISTS pi_sign_date TEXT DEFAULT '';
ALTER TABLE ethics_submissions ADD COLUMN IF NOT EXISTS review_method TEXT DEFAULT '';
ALTER TABLE ethics_submissions ADD COLUMN IF NOT EXISTS review_date TEXT DEFAULT '';

-- ========== 3. protocol_deviations 补齐列 ==========
ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS pd_number TEXT DEFAULT '';
ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'Minor';
ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS violated_clause TEXT DEFAULT '';
ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS occurred_date TEXT DEFAULT '';
ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS discovered_date TEXT DEFAULT '';
ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS reported_sponsor_date TEXT DEFAULT '';
ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS reported_ethics_date TEXT DEFAULT '';
ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS subject_ids TEXT DEFAULT '';
ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS corrective_action TEXT DEFAULT '';

-- ========== 4. 新建 startup_logs 表 ==========
CREATE TABLE IF NOT EXISTS startup_logs (
    id TEXT PRIMARY KEY,
    startup_task_id TEXT DEFAULT '',
    startup_task_name TEXT DEFAULT '',
    target_task_id TEXT DEFAULT '',
    target_task_name TEXT DEFAULT '',
    calmness_before INTEGER DEFAULT 2,
    calmness_after INTEGER DEFAULT 2,
    duration_minutes INTEGER DEFAULT 15,
    notes TEXT DEFAULT '',
    executed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE startup_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "cra_startup_logs_all" ON startup_logs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========== 5. 确认 startup_tasks 有 done 列 ==========
ALTER TABLE startup_tasks ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT FALSE;

-- ========== 6. 确认所有表 RLS 已启用 ==========
DO $$ BEGIN ALTER TABLE research_staff ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ethics_submissions ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE protocol_deviations ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE startup_tasks ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
