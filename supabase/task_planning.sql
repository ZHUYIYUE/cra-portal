-- 待办任务规划字段：预计耗时、执行中开始时间
-- 在 Supabase SQL Editor 执行一次即可。

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT NULL;

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS started_at TEXT DEFAULT '';

COMMENT ON COLUMN tasks.estimated_minutes IS '预计耗时，单位：分钟';
COMMENT ON COLUMN tasks.started_at IS '最近一次开始执行时间，ISO 字符串';
