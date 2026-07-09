-- ========== 中心伦理递交包进度 ==========
-- 项目文件是项目级主数据；递交包是中心级进度。
-- 同一份项目文件在不同中心可以有不同递交状态、签收状态、审查方式、批件/回执和费用状态。

CREATE TABLE IF NOT EXISTS ethics_submission_packages (
    id TEXT PRIMARY KEY,
    project_id TEXT DEFAULT '',
    center_id TEXT DEFAULT '',
    package_name TEXT DEFAULT '',
    source_type TEXT DEFAULT '项目文件更新',
    received_date TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    review_type TEXT DEFAULT '待确认',
    status TEXT DEFAULT '待准备',
    cta_to_pi_status TEXT DEFAULT '未生成',
    pi_to_ec_status TEXT DEFAULT '未生成',
    sent_to_center_date TEXT DEFAULT '',
    pi_signed_date TEXT DEFAULT '',
    ec_submitted_date TEXT DEFAULT '',
    ec_received_date TEXT DEFAULT '',
    approval_received_date TEXT DEFAULT '',
    receipt_received_date TEXT DEFAULT '',
    payment_required BOOLEAN DEFAULT FALSE,
    fee_status TEXT DEFAULT '不适用',
    ethics_committee TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ethics_submission_package_items (
    id TEXT PRIMARY KEY,
    package_id TEXT DEFAULT '',
    project_document_id TEXT DEFAULT '',
    doc_category TEXT DEFAULT '',
    doc_name TEXT DEFAULT '',
    version TEXT DEFAULT '',
    version_date TEXT DEFAULT '',
    copies INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ethics_submission_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethics_submission_package_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    CREATE POLICY "cra_ethics_submission_packages_all"
    ON ethics_submission_packages
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "cra_ethics_submission_package_items_all"
    ON ethics_submission_package_items
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ethics_submission_packages_project ON ethics_submission_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_ethics_submission_packages_center ON ethics_submission_packages(center_id);
CREATE INDEX IF NOT EXISTS idx_ethics_submission_packages_status ON ethics_submission_packages(status);
CREATE INDEX IF NOT EXISTS idx_ethics_submission_package_items_package ON ethics_submission_package_items(package_id);
