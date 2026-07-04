-- ========== 伦理递交增强：双模板支持 ==========

-- 1. projects 表补齐字段
ALTER TABLE projects ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approval_number TEXT DEFAULT '';

-- 2. centers 表补齐伦理委员会名称
ALTER TABLE centers ADD COLUMN IF NOT EXISTS ethics_committee_name TEXT DEFAULT '';

-- 3. ethics_letters 表加信件类型
ALTER TABLE ethics_letters ADD COLUMN IF NOT EXISTS letter_type TEXT DEFAULT 'CRA_to_PI';

-- 4. ethics_templates 表加信件类型
ALTER TABLE ethics_templates ADD COLUMN IF NOT EXISTS letter_type TEXT DEFAULT 'CRA_to_PI';

-- 5. 给现有模板设置默认类型
UPDATE ethics_templates SET letter_type = 'CRA_to_PI' WHERE letter_type IS NULL OR letter_type = '';
