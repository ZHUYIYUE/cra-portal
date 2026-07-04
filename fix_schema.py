"""
Supabase 表结构修复脚本 v2
通过 Supabase Pooler (IPv4) 连接
"""
import psycopg2

# 尝试两个区域的 pooler
POOLER_CONFIGS = [
    {
        "name": "Tokyo (ap-northeast-1)",
        "host": "aws-0-ap-northeast-1.pooler.supabase.com",
        "port": "6543",
    },
    {
        "name": "Singapore (ap-southeast-1)",
        "host": "aws-0-ap-southeast-1.pooler.supabase.com",
        "port": "6543",
    },
]

DB_NAME = "postgres"
DB_USER = "postgres.ospnktbwlbsdveawrkzd"
DB_PASS = "Mrwhite158@"

SQL_STATEMENTS = [
    # projects 表补全列
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS code TEXT DEFAULT '';",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT '';",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS dbl_date TEXT DEFAULT '';",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();",

    # centers 表补全列
    "ALTER TABLE centers ADD COLUMN IF NOT EXISTS code TEXT DEFAULT '';",
    "ALTER TABLE centers ADD COLUMN IF NOT EXISTS department TEXT DEFAULT '';",
    "ALTER TABLE centers ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';",
    "ALTER TABLE centers ADD COLUMN IF NOT EXISTS pi_name TEXT DEFAULT '';",
    "ALTER TABLE centers ADD COLUMN IF NOT EXISTS pi_phone TEXT DEFAULT '';",
    "ALTER TABLE centers ADD COLUMN IF NOT EXISTS pi_email TEXT DEFAULT '';",
    "ALTER TABLE centers ADD COLUMN IF NOT EXISTS contact_crc TEXT DEFAULT '';",
    "ALTER TABLE centers ADD COLUMN IF NOT EXISTS contact_crc_phone TEXT DEFAULT '';",
    "ALTER TABLE centers ADD COLUMN IF NOT EXISTS contact_ethics TEXT DEFAULT '';",
    "ALTER TABLE centers ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '{}'::jsonb;",
    "ALTER TABLE centers ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';",
    "ALTER TABLE centers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();",

    # tasks 表补全列
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ability_type TEXT DEFAULT 'execution';",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_status TEXT DEFAULT 'pending';",

    # findings 表补全列
    "ALTER TABLE findings ADD COLUMN IF NOT EXISTS project_id TEXT DEFAULT '';",
    "ALTER TABLE findings ADD COLUMN IF NOT EXISTS found_date TEXT DEFAULT '';",
    "ALTER TABLE findings ADD COLUMN IF NOT EXISTS corrective_action TEXT DEFAULT '';",
    "ALTER TABLE findings ADD COLUMN IF NOT EXISTS finding_number TEXT DEFAULT '';",
    "ALTER TABLE findings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();",

    # 新建表
    """CREATE TABLE IF NOT EXISTS ethics_submissions (
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
    );""",
    """CREATE TABLE IF NOT EXISTS protocol_deviations (
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
    );""",
    """CREATE TABLE IF NOT EXISTS research_staff (
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
    );""",
    """CREATE TABLE IF NOT EXISTS startup_tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        done BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT now()
    );""",

    # 索引
    "CREATE INDEX IF NOT EXISTS idx_centers_project ON centers(project_id);",
    "CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);",
    "CREATE INDEX IF NOT EXISTS idx_tasks_center ON tasks(center_id);",
    "CREATE INDEX IF NOT EXISTS idx_findings_project ON findings(project_id);",
    "CREATE INDEX IF NOT EXISTS idx_findings_center ON findings(center_id);",

    # RLS
    "ALTER TABLE projects ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE centers ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE findings ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE ethics_submissions ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE protocol_deviations ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE research_staff ENABLE ROW LEVEL SECURITY;",

    # 策略
    """DO $$ BEGIN CREATE POLICY "cra_projects_all" ON projects FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
    """DO $$ BEGIN CREATE POLICY "cra_centers_all" ON centers FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
    """DO $$ BEGIN CREATE POLICY "cra_tasks_all" ON tasks FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
    """DO $$ BEGIN CREATE POLICY "cra_findings_all" ON findings FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
    """DO $$ BEGIN CREATE POLICY "cra_ethics_all" ON ethics_submissions FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
    """DO $$ BEGIN CREATE POLICY "cra_deviations_all" ON protocol_deviations FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
    """DO $$ BEGIN CREATE POLICY "cra_staff_all" ON research_staff FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
]


def main():
    conn = None
    for cfg in POOLER_CONFIGS:
        print(f"\n尝试连接 {cfg['name']}...")
        try:
            conn = psycopg2.connect(
                host=cfg["host"],
                port=cfg["port"],
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASS,
                sslmode="require",
                connect_timeout=15
            )
            print(f"✅ 连接成功！")
            break
        except Exception as e:
            print(f"❌ 失败: {e}")
            conn = None

    if not conn:
        print("\n❌ 所有连接方式都失败了")
        return

    conn.autocommit = True
    cur = conn.cursor()

    print("\n🔨 执行表结构修复...")
    success = 0
    failed = 0
    for i, stmt in enumerate(SQL_STATEMENTS, 1):
        preview = stmt.strip().replace("\n", " ")[:70]
        try:
            cur.execute(stmt)
            success += 1
            print(f"  [{i}/{len(SQL_STATEMENTS)}] ✅ {preview}")
        except Exception as e:
            failed += 1
            print(f"  [{i}/{len(SQL_STATEMENTS)}] ⚠️  {preview}")
            print(f"         {e}")

    # 验证
    print("\n📋 验证表结构...")
    cur.execute("""
        SELECT table_name, string_agg(column_name, ', ' ORDER BY ordinal_position)
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('projects', 'centers', 'tasks', 'findings',
                             'ethics_submissions', 'protocol_deviations',
                             'research_staff', 'startup_tasks')
        GROUP BY table_name ORDER BY table_name;
    """)
    for row in cur.fetchall():
        print(f"  📁 {row[0]}: {row[1]}")

    cur.close()
    conn.close()
    print(f"\n✅ 完成: {success} 成功, {failed} 跳过")


if __name__ == "__main__":
    main()
