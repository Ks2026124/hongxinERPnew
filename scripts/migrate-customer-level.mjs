#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 鸿信ERP 客户等级字段迁移脚本
 *
 * 用途：在 Vercel 生产环境所连接的 Supabase 实例上执行：
 *   1. 给 public.customers 添加 customer_level varchar(1) DEFAULT 'A'
 *   2. 添加 CHECK (customer_level IN ('A','B','C','D')) 约束（如不存在）
 *   3. 把历史 customer_level IS NULL 的客户回填为 'A'
 *   4. 通知 PostgREST 刷新 schema cache
 *   5. 校验：字段存在、约束存在、历史回填、schema cache 已识别 customer_level
 *
 * 用法（在 Vercel 生产环境，或任何能访问生产 Supabase 的机器上）：
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/migrate-customer-level.mjs
 *
 * 注意：本脚本只通过 Postgres SQL 执行 DDL/DML，不会删除/重建 customers 表。
 *      需要数据库连接串（SUPABASE_DB_URL / DATABASE_URL）。
 *      若只有 service_role key 没有直连串，可以用 Vercel Storage 控制台的 SQL Editor
 *      跑 scripts/migrate-customer-level.sql 中同样的语句。
 */

const REQUIRED_ENVS = ['NEXT_PUBLIC_SUPABASE_URL'];

function getDbUrl() {
  const raw =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DATABASE_URL;
  if (!raw) return null;
  // 兼容 sslmode 字符串
  return raw;
}

async function runSql(pg, sql) {
  const client = new pg.Client({ connectionString: getDbUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    return await client.query(sql);
  } finally {
    await client.end();
  }
}

async function fetchJson(url, init) {
  const r = await fetch(url, init);
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
}

async function main() {
  for (const k of REQUIRED_ENVS) {
    if (!process.env[k]) {
      console.error(`[migrate] missing env: ${k}`);
      process.exit(1);
    }
  }
  const dbUrl = getDbUrl();
  if (!dbUrl) {
    console.error('[migrate] 未找到数据库直连串。请设置 SUPABASE_DB_URL 或 DATABASE_URL。');
    console.error('         火山引擎 Supabase 控制台 → 数据库 → Connection string。');
    console.error('         或者在控制台 SQL Editor 直接执行 scripts/migrate-customer-level.sql');
    process.exit(2);
  }

  let pg;
  try {
    pg = await import('pg');
  } catch {
    console.error('[migrate] 缺少 pg 依赖，执行: pnpm add -D pg');
    process.exit(3);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('[migrate] missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('[migrate] target:', url);

  // 1. 检查字段是否已存在
  const checkCol = await runSql(pg, `
    SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='customers' AND column_name='customer_level';
  `);
  if (checkCol.rowCount === 0) {
    console.log('[migrate] customer_level 不存在，执行 ALTER TABLE ADD COLUMN ...');
    await runSql(pg, `
      ALTER TABLE public.customers
      ADD COLUMN customer_level varchar(1) DEFAULT 'A';
    `);
    console.log('[migrate] 字段已添加');
  } else {
    console.log('[migrate] customer_level 已存在:', checkCol.rows[0]);
  }

  // 2. CHECK 约束（幂等）
  const checkCon = await runSql(pg, `
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.customers'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%customer_level%';
  `);
  if (checkCon.rowCount === 0) {
    console.log('[migrate] 添加 CHECK 约束 customers_customer_level_check ...');
    await runSql(pg, `
      ALTER TABLE public.customers
      ADD CONSTRAINT customers_customer_level_check
      CHECK (customer_level IN ('A','B','C','D'));
    `);
  } else {
    console.log('[migrate] CHECK 约束已存在:', checkCon.rows.map(r => r.conname).join(', '));
  }

  // 3. 回填历史数据
  const backfill = await runSql(pg, `
    UPDATE public.customers SET customer_level = 'A' WHERE customer_level IS NULL;
  `);
  console.log(`[migrate] 回填历史客户 customer_level='A'，影响 ${backfill.rowCount} 行`);

  // 4. NOTIFY pgrst reload schema cache
  try {
    await runSql(pg, `NOTIFY pgrst, 'reload schema';`);
    console.log('[migrate] NOTIFY pgrst reload schema 已发送');
  } catch (e) {
    console.warn('[migrate] NOTIFY pgrst 失败（火山引擎托管可能不支持，可忽略，稍后到控制台手动 Reload）:', e.message);
  }

  // 等 2 秒让 PostgREST 拉取新 schema
  await new Promise(r => setTimeout(r, 2000));

  // 5. 校验：直连
  const verify = await runSql(pg, `
    SELECT customer_level, COUNT(*)::int AS cnt
    FROM public.customers GROUP BY customer_level ORDER BY customer_level;
  `);
  console.log('[migrate] 当前 customers 按等级分布:');
  console.table(verify.rows);

  // 6. 校验：通过 PostgREST OpenAPI 确认 schema cache
  const openApi = await fetchJson(`${url}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/openapi+json',
    },
    cache: 'no-store',
  });
  const defs = openApi.body?.definitions?.customers?.properties;
  const inCache = !!(defs && 'customer_level' in defs);
  console.log('[migrate] PostgREST schema cache 中 customers 字段:', defs ? Object.keys(defs) : null);
  console.log('[migrate] customer_level_in_cache =', inCache);

  // 7. 校验：SELECT 一行
  const sample = await fetchJson(
    `${url}/rest/v1/customers?select=id,customer_name,customer_level&order=id.desc&limit=3`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  console.log('[migrate] 最近 3 条客户:', sample.body);

  if (!inCache) {
    console.error('[migrate] ❌ customer_level 仍未进入 PostgREST schema cache。');
    console.error('         请到火山引擎 Supabase 控制台对该项目执行 "Reload schema cache" 或重启 PostgREST。');
    process.exit(4);
  }
  console.log('[migrate] ✅ 迁移完成');
}

main().catch(e => {
  console.error('[migrate] fatal:', e);
  process.exit(1);
});
