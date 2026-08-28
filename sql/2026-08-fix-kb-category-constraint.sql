-- Fix knowledge_base_category_check: the constraint only allowed 4 categories
-- (下单前_产品, 下单前_安装, 下单后_流程, 销售话术) while manager.html's KB tab dropdown
-- offers 9 categories, so 5 of them silently failed to save. Widen it to match.
alter table knowledge_base drop constraint knowledge_base_category_check;
alter table knowledge_base add constraint knowledge_base_category_check
  check (category = any (array['价格_Pricelist','Promotion_Memo','产品知识','话术FAQ','Flow内容','下单后_流程','销售话术','下单前_产品','下单前_安装']::text[]));
