-- Coway AI Coach — 合并 Staff / Manager 账号（2026-08）
-- 在 Supabase SQL Editor 手动执行

ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_manager boolean NOT NULL DEFAULT false;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS manager_scope_team text; -- NULL = 看全部 team

UPDATE staff SET is_manager = true, manager_scope_team = NULL WHERE name = 'Ze Hao';

-- managers 表保留但不再使用，不做删除
