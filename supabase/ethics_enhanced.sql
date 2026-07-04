-- ========== 伦理递交管理增强 ==========

-- 1. 新建 ethics_letters 表（递交信批次）
CREATE TABLE IF NOT EXISTS ethics_letters (
    id TEXT PRIMARY KEY,
    project_id TEXT DEFAULT '',
    center_id TEXT DEFAULT '',
    submission_date TEXT DEFAULT '',
    submitter_name TEXT DEFAULT '',
    submitter_phone TEXT DEFAULT '',
    submit_method TEXT DEFAULT '快递',
    tracking_number TEXT DEFAULT '',
    ethics_committee TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 新建 ethics_letter_items 表（递交信文件清单）
CREATE TABLE IF NOT EXISTS ethics_letter_items (
    id TEXT PRIMARY KEY,
    letter_id TEXT DEFAULT '',
    doc_type TEXT DEFAULT '',
    doc_name TEXT DEFAULT '',
    version TEXT DEFAULT '',
    version_date TEXT DEFAULT '',
    copies INTEGER DEFAULT 1,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 新建 ethics_templates 表（模板元数据）
CREATE TABLE IF NOT EXISTS ethics_templates (
    id TEXT PRIMARY KEY,
    name TEXT DEFAULT '',
    file_path TEXT DEFAULT '',
    description TEXT DEFAULT '',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 启用 RLS
ALTER TABLE ethics_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethics_letter_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethics_templates ENABLE ROW LEVEL SECURITY;

-- 5. 创建策略（允许 anon 访问）
DO $$ BEGIN CREATE POLICY "cra_ethics_letters_all" ON ethics_letters FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cra_ethics_letter_items_all" ON ethics_letter_items FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cra_ethics_templates_all" ON ethics_templates FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. 创建 Storage bucket 存储模板文件
INSERT INTO storage.buckets (id, name, public) VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage 策略（允许 anon 读写）
DO $$ BEGIN CREATE POLICY "cra_templates_read" ON storage.objects FOR SELECT USING (bucket_id = 'templates'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cra_templates_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'templates'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cra_templates_update" ON storage.objects FOR UPDATE USING (bucket_id = 'templates'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cra_templates_delete" ON storage.objects FOR DELETE USING (bucket_id = 'templates'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. projects 表补齐申办方/CRO字段
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sponsor TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cro_name TEXT DEFAULT '';
