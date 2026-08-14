/**
 * 业务日期工具：统一以 Asia/Shanghai（北京时间，UTC+8）作为"今日"边界。
 *
 * 背景：服务器运行在 UTC 时区，`new Date().toISOString().slice(0,10)` 返回的是
 * UTC 日期，在北京时间 00:00–08:00 之间会比真实业务日期晚一天，导致"今日新增"
 * 把昨天的数据算到今天。同时数据库中 `created_at` 以 UTC 存储，因此：
 *
 *   正确做法：把"北京时间当天 00:00 / 次日 00:00"转换成 UTC 即时点，
 *             再用 `created_at >= start AND created_at < end` 比较。
 *
 * 禁止：在业务统计中直接使用 `toISOString().slice(0,10)` / `split('T')[0]`
 *      拼接一个没有时区信息的 naive 字符串当作 UTC 边界使用。
 */

const SHANGHAI_TZ = "Asia/Shanghai";

/**
 * 返回给定 Date（默认 now）在 Asia/Shanghai 时区下的日历信息。
 * 注意：Date.UTC 构造出的 Date 内部是正确的 UTC 即时点，
 * 对应"上海那一天的 00:00:00 +08:00"。
 */
function getShanghaiCalendarParts(now: Date = new Date()) {
  // en-CA 语言区域保证 YYYY-MM-DD 格式
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
}

export interface ShanghaiDayRange {
  /** 北京时间当天 00:00:00 对应的 UTC 即时点（ISO，带 Z） */
  start: Date;
  /** 北京时间次日 00:00:00 对应的 UTC 即时点（ISO，带 Z） */
  end: Date;
  /** 北京时间当天的 YYYY-MM-DD（仅用于展示/调试，不要用于 SQL 比较） */
  dateStr: string;
  /** start 的 ISO 字符串，可直接传给 Supabase `.gte('created_at', iso)` */
  startISO: string;
  /** end 的 ISO 字符串，可直接传给 Supabase `.lt('created_at', iso)` */
  endISO: string;
}

/**
 * 返回 Asia/Shanghai 时区下"今日"的时间范围 [start, end)：
 *   start = 上海今天 00:00:00 对应的 UTC 时点
 *   end   = 上海明天 00:00:00 对应的 UTC 时点
 *
 * 使用方式：
 *   const { startISO, endISO } = getShanghaiDayRange();
 *   supabase.from('customers').gte('created_at', startISO).lt('created_at', endISO);
 */
export function getShanghaiDayRange(now: Date = new Date()): ShanghaiDayRange {
  const { year, month, day } = getShanghaiCalendarParts(now);
  // 上海时间 = UTC+8，因此上海当天 00:00:00 = UTC 前一天 16:00:00
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 8 * 3600 * 1000);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  const dateStr = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  return {
    start,
    end,
    dateStr,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}

/**
 * 兼容旧调用：返回北京时间今天的 YYYY-MM-DD 字符串。
 * 注意：该字符串不携带时区，**不要直接拼 'T00:00:00Z'**。
 * 业务统计请使用 getShanghaiDayRange() 拿到的 startISO/endISO。
 */
export function getShanghaiDateStr(now: Date = new Date()): string {
  return getShanghaiDayRange(now).dateStr;
}
