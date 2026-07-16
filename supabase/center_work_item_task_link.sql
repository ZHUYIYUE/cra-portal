-- 中心工作事项与待办联动
-- 在 Supabase SQL Editor 中执行一次即可。
-- 一个中心事项在任一时刻只同步一条“当前未完成步骤”的系统待办。

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS source_work_item_id TEXT DEFAULT '';

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS source_work_item_step_id TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_tasks_source_work_item
ON tasks(source_work_item_id);

COMMENT ON COLUMN tasks.source_type IS '任务来源：manual 或 center_work_item';
COMMENT ON COLUMN tasks.source_work_item_id IS '来源中心工作事项 ID';
COMMENT ON COLUMN tasks.source_work_item_step_id IS '来源中心工作事项步骤 ID';
