-- Coway AI Coach — 数据库初始化
-- 在 Supabase SQL Editor 中运行此文件

-- ── staff ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  pin         text NOT NULL,
  team        text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── customers ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name          text NOT NULL,
  team                text,
  label               text NOT NULL,
  status              text NOT NULL DEFAULT '新客户'
                        CHECK (status IN ('新客户','考虑中','需跟进','成交','冷了')),
  next_followup_date  date,
  followup_note       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── interactions ────────────────────────────────────────────────
-- 注意：绝不存截图本身，绝不存客户电话号码
CREATE TABLE IF NOT EXISTS interactions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  staff_name         text NOT NULL,
  situation_summary  text NOT NULL,
  ai_suggestion      text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ── knowledge_base ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_base (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text NOT NULL
                CHECK (category IN ('下单前_产品','下单前_安装','下单后_流程','销售话术')),
  product     text,
  topic       text NOT NULL,
  content     text NOT NULL,
  keywords    text,
  is_active   boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── qa_log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qa_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name  text NOT NULL,
  question    text NOT NULL,
  answer      text,
  answered    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 自动更新 customers.updated_at ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 示例：插入员工数据 ───────────────────────────────────────────
-- 替换成实际员工的名字和 PIN（4-6 位数字均可）
-- INSERT INTO staff (name, pin, team) VALUES
--   ('张小明', '1234', 'A组'),
--   ('李小红', '5678', 'A组'),
--   ('王大力', '9012', 'B组');
