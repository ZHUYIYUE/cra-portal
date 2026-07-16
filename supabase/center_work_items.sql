-- ========== 中心工作事项 ==========
-- 在 Supabase SQL Editor 中执行。用于管理一件完整工作及其推进步骤。

CREATE TABLE IF NOT EXISTS center_work_items (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    center_id TEXT NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    item_type TEXT DEFAULT '其他',
    project_stage TEXT DEFAULT '',
    status TEXT DEFAULT '进行中',
    priority TEXT DEFAULT 'medium',
    waiting_for TEXT DEFAULT '',
    next_action TEXT DEFAULT '',
    follow_up_date TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    last_progress_at TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    completed_at TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS center_work_item_steps (
    id TEXT PRIMARY KEY,
    work_item_id TEXT NOT NULL REFERENCES center_work_items(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT '待处理',
    waiting_for TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    done BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS center_work_item_activities (
    id TEXT PRIMARY KEY,
    work_item_id TEXT NOT NULL REFERENCES center_work_items(id) ON DELETE CASCADE,
    action_type TEXT DEFAULT '推进记录',
    content TEXT DEFAULT '',
    action_date TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE center_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_work_item_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_work_item_activities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "cra_center_work_items_all" ON center_work_items FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE POLICY "cra_center_work_item_steps_all" ON center_work_item_steps FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE POLICY "cra_center_work_item_activities_all" ON center_work_item_activities FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_center_work_items_center ON center_work_items(center_id);
CREATE INDEX IF NOT EXISTS idx_center_work_items_project ON center_work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_center_work_items_status ON center_work_items(status);
CREATE INDEX IF NOT EXISTS idx_center_work_items_follow_up ON center_work_items(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_center_work_item_steps_item ON center_work_item_steps(work_item_id);
CREATE INDEX IF NOT EXISTS idx_center_work_item_activities_item ON center_work_item_activities(work_item_id);
