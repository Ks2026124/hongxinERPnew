-- 鸿信ERP: 为 public.customers 添加 customer_level 字段
-- 幂等脚本，可在 SQL Editor 中重复执行
-- 不会删除或重建 customers 表，不会影响历史客户数据

-- 1. 新增字段（若不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='customers' AND column_name='customer_level'
  ) THEN
    ALTER TABLE public.customers
      ADD COLUMN customer_level varchar(1) DEFAULT 'A';
    RAISE NOTICE 'customer_level 字段已添加';
  ELSE
    RAISE NOTICE 'customer_level 字段已存在，跳过 ADD COLUMN';
  END IF;
END $$;

-- 2. CHECK 约束（若不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.customers'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%customer_level%'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_customer_level_check
      CHECK (customer_level IN ('A','B','C','D'));
    RAISE NOTICE 'CHECK 约束已添加';
  ELSE
    RAISE NOTICE 'CHECK 约束已存在，跳过';
  END IF;
END $$;

-- 3. 回填历史数据
UPDATE public.customers
SET customer_level = 'A'
WHERE customer_level IS NULL;

-- 4. 通知 PostgREST 刷新 schema cache（火山引擎托管若不支持可忽略，到控制台手动 Reload）
NOTIFY pgrst, 'reload schema';

-- 5. 校验
SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='customers' AND column_name='customer_level';

SELECT customer_level, COUNT(*)::int AS cnt
FROM public.customers
GROUP BY customer_level
ORDER BY customer_level;
