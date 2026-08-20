-- Coway AI Coach — Add-On 迁移（2026-08）
-- 在 Supabase SQL Editor 手动执行
-- 注意：生产库 schema 已经和 sql/setup.sql 不同步（ai_feedback / qa_log /
-- knowledge_base 分类是后来在 Supabase 里直接改的），所以新增迁移单独放这里，
-- 不改 setup.sql。

-- ── managers：Manager 账号（替代 MANAGER_PASSWORD 共享密码）──────
CREATE TABLE IF NOT EXISTS managers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  password    text NOT NULL,
  team        text,              -- NULL = 看全部 team；否则只看自己 team
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── ai_feedback 加 team 列，方便 Manager 按 team 过滤报错列表 ─────
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS team text;

-- ── products：产品图册（Manager 维护，图片链接手动填 coway.com.my 的图）
CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,        -- 建议跟 knowledge_base.product 对上，用于 AI 回复自动配图
  image_url    text NOT NULL,
  product_url  text,                 -- coway.com.my 产品页链接
  sort_order   int NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 初次上线：插入一个「看全部 team」的 Manager 账号 ──────────────
-- 把下面的名字和密码换成真实要用的，密码建议至少 6 位
-- INSERT INTO managers (name, password, team) VALUES ('限量', 'CHANGE_ME', NULL);
