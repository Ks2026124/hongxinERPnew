import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================================
// 系统表（禁止删除）
// ============================================================

export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

// ============================================================
// 1. teams - 团队表
// ============================================================

export const teams = pgTable(
  "teams",
  {
    id: serial().primaryKey(),
    team_code: varchar("team_code", { length: 50 }).notNull().unique(),
    team_name: varchar("team_name", { length: 100 }).notNull(),
    remark: text("remark"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("teams_team_code_idx").on(table.team_code),
  ]
);

// ============================================================
// 2. profiles - 员工/管理员账户表
// ============================================================

export const profiles = pgTable(
  "profiles",
  {
    id: serial().primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password_hash: varchar("password_hash", { length: 255 }).notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    role: varchar("role", { length: 20 }).notNull().default("employee"),
    team_id: integer("team_id").references(() => teams.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    avatar_url: varchar("avatar_url", { length: 500 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("profiles_username_idx").on(table.username),
    index("profiles_team_id_idx").on(table.team_id),
    index("profiles_role_idx").on(table.role),
    index("profiles_status_idx").on(table.status),
    index("profiles_team_role_idx").on(table.team_id, table.role),
  ]
);

// ============================================================
// 3. customers - 客户表
// ============================================================

export const customers = pgTable(
  "customers",
  {
    id: serial().primaryKey(),
    employee_id: integer("employee_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
    team_id: integer("team_id").notNull().references(() => teams.id, { onDelete: "restrict" }),
    customer_name: varchar("customer_name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    wechat_id: varchar("wechat_id", { length: 100 }),
    remark: text("remark"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("customers_employee_id_idx").on(table.employee_id),
    index("customers_team_id_idx").on(table.team_id),
    index("customers_employee_created_idx").on(table.employee_id, table.created_at),
    index("customers_team_created_idx").on(table.team_id, table.created_at),
  ]
);

// ============================================================
// 4. customer_images - 客户微信截图表
// ============================================================

export const customerImages = pgTable(
  "customer_images",
  {
    id: serial().primaryKey(),
    customer_id: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    employee_id: integer("employee_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
    team_id: integer("team_id").notNull().references(() => teams.id, { onDelete: "restrict" }),
    image_url: varchar("image_url", { length: 500 }).notNull(),
    thumbnail_url: varchar("thumbnail_url", { length: 500 }),
    sha256: varchar("sha256", { length: 64 }),
    phash: varchar("phash", { length: 64 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("customer_images_customer_id_idx").on(table.customer_id),
    index("customer_images_employee_id_idx").on(table.employee_id),
    index("customer_images_team_id_idx").on(table.team_id),
    index("customer_images_sha256_idx").on(table.sha256),
    index("customer_images_phash_idx").on(table.phash),
    index("customer_images_created_at_idx").on(table.created_at),
  ]
);

// ============================================================
// 5. daily_stats - 员工每日统计表
// ============================================================

export const dailyStats = pgTable(
  "daily_stats",
  {
    id: serial().primaryKey(),
    employee_id: integer("employee_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    team_id: integer("team_id").notNull().references(() => teams.id, { onDelete: "restrict" }),
    stat_date: date("stat_date").notNull(),
    customer_count: integer("customer_count").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("daily_stats_employee_id_idx").on(table.employee_id),
    index("daily_stats_team_id_idx").on(table.team_id),
    index("daily_stats_stat_date_idx").on(table.stat_date),
    uniqueIndex("daily_stats_employee_date_idx").on(table.employee_id, table.stat_date),
    index("daily_stats_team_date_idx").on(table.team_id, table.stat_date),
  ]
);
