'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, TrendingUp, Trophy, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employee-avatar';
import { useEmployeeAvatars } from '@/hooks/use-employee-avatars';
import { Badge } from '@/components/ui/badge';

interface LevelStats { A: number; B: number; C: number; D: number; }
interface Transitions { A_to_B: number; B_to_C: number; C_to_D: number; }
interface TeamEmployee {
  id: number;
  name: string;
  avatar_url: string | null;
  today_customers: number;
  total_customers: number;
  level_stats?: LevelStats;
  today_level_stats?: LevelStats;
  transitions?: Transitions;
}

interface TeamStat {
  id: number;
  team_name: string;
  team_code: string;
  today_customers: number;
  total_customers: number;
  level_stats?: LevelStats;
  today_level_stats?: LevelStats;
  transitions?: Transitions;
  employees: TeamEmployee[];
}

interface AdminStats {
  teams: TeamStat[];
  today_transitions?: Transitions;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const [expandedEmployees, setExpandedEmployees] = useState<Set<number>>(new Set());

  const toggleEmployee = (id: number) => {
    setExpandedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allEmployeeIds = useMemo(() => {
    if (!stats?.teams) return [];
    return stats.teams.flatMap(t => t.employees.map(e => e.id));
  }, [stats]);

  // 批量获取员工头像
  const { avatarMap } = useEmployeeAvatars(allEmployeeIds);

  useEffect(() => {
    fetchStats();
  }, [dateRange, customStart, customEnd]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('range', dateRange);
      if (dateRange === 'custom') {
        if (customStart) params.set('start', customStart);
        if (customEnd) params.set('end', customEnd);
      }
      const res = await fetch(`/api/admin/stats?${params.toString()}`);
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error('获取统计失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (index: number) => {
    // 蓝色渐变：第 1 名最深，后续逐渐变浅
    const styles = [
      'bg-blue-600/15 text-blue-700 border-blue-600/30',  // 第 1 名：最深蓝
      'bg-blue-500/12 text-blue-600 border-blue-500/25',  // 第 2 名
      'bg-blue-400/10 text-blue-600 border-blue-400/20',  // 第 3 名
      'bg-blue-300/8 text-blue-500 border-blue-300/15',   // 第 4 名
      'bg-blue-200/6 text-blue-500 border-blue-200/10',   // 第 5 名
      'bg-blue-100/4 text-blue-400 border-blue-100/8',    // 第 6 名及以后
    ];
    return styles[Math.min(index, styles.length - 1)];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const totalTeams = stats?.teams.length ?? 0;
  const totalEmployees = stats?.teams.reduce((sum, t) => sum + t.employees.length, 0) ?? 0;
  const totalCustomers = stats?.teams.reduce((sum, t) => sum + t.total_customers, 0) ?? 0;
  const todayCustomers = stats?.teams.reduce((sum, t) => sum + t.today_customers, 0) ?? 0;

  // 计算客户等级统计
  const levelStats = stats?.teams.reduce(
    (acc, t) => {
      if (t.level_stats) {
        acc.A += t.level_stats.A;
        acc.B += t.level_stats.B;
        acc.C += t.level_stats.C;
        acc.D += t.level_stats.D;
      }
      return acc;
    },
    { A: 0, B: 0, C: 0, D: 0 }
  ) ?? { A: 0, B: 0, C: 0, D: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管理员工作台</h1>
        <p className="text-muted-foreground mt-1">全局数据概览</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium">统计日期范围</p>
            <p className="text-xs text-muted-foreground mt-1">今日新增与转化数据会随日期范围变化，当前客户数量保持实时统计</p>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="today">今天</option>
              <option value="yesterday">昨天</option>
              <option value="7d">近7天</option>
              <option value="custom">自定义日期</option>
            </select>
            {dateRange === 'custom' && (
              <>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
                <span className="text-sm text-muted-foreground">至</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
              </>
            )}
          </div>
        </div>
      </Card>

      {/* 客户等级统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A类客户</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{levelStats.A}</div>
            <p className="text-xs text-blue-600 mt-1">新增客户</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">B类客户</CardTitle>
            <Users className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-700">{levelStats.B}</div>
            <p className="text-xs text-cyan-600 mt-1">深聊客户</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">C类客户</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">{levelStats.C}</div>
            <p className="text-xs text-amber-600 mt-1">付费意向</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">D类客户</CardTitle>
            <Trophy className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{levelStats.D}</div>
            <p className="text-xs text-emerald-600 mt-1">成交客户</p>
          </CardContent>
        </Card>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">团队总数</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeams}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">员工总数</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日新增客户</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累计客户数</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>
      </div>

      {/* 今日客户转化 */}
      {stats?.today_transitions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">今日客户转化</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                <ArrowRight className="h-4 w-4 text-blue-600" />
                <span className="text-sm">A → B:</span>
                <span className="font-bold text-blue-700">{stats.today_transitions.A_to_B}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-cyan-50 rounded-lg">
                <ArrowRight className="h-4 w-4 text-cyan-600" />
                <span className="text-sm">B → C:</span>
                <span className="font-bold text-cyan-700">{stats.today_transitions.B_to_C}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg">
                <ArrowRight className="h-4 w-4 text-emerald-600" />
                <span className="text-sm">C → D:</span>
                <span className="font-bold text-emerald-700">{stats.today_transitions.C_to_D}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 团队详情 */}
      {stats?.teams && stats.teams.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {stats.teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {team.team_name}
                  </CardTitle>
                  <Badge variant="outline">{team.team_code}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">期间新增</p>
                    <p className="text-lg font-bold text-primary">{team.today_customers}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">累计客户</p>
                    <p className="text-lg font-bold">{team.total_customers}</p>
                  </div>
                  <div className="rounded-lg border p-3 col-span-2 md:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">期间变化</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="text-blue-600">A+{team.today_level_stats?.A || 0}</span>
                      <span className="text-cyan-600">B+{team.today_level_stats?.B || 0}</span>
                      <span className="text-amber-600">C+{team.today_level_stats?.C || 0}</span>
                      <span className="text-emerald-600">D+{team.today_level_stats?.D || 0}</span>
                    </div>
                  </div>
                </div>
                {team.level_stats && (
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <div className="rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-950/30">
                      <p className="text-xs text-muted-foreground">A类当前</p>
                      <p className="text-base font-bold text-blue-600">{team.level_stats.A}</p>
                    </div>
                    <div className="rounded-lg bg-cyan-50 px-3 py-2 dark:bg-cyan-950/30">
                      <p className="text-xs text-muted-foreground">B类当前</p>
                      <p className="text-base font-bold text-cyan-600">{team.level_stats.B}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
                      <p className="text-xs text-muted-foreground">C类当前</p>
                      <p className="text-base font-bold text-amber-600">{team.level_stats.C}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
                      <p className="text-xs text-muted-foreground">D类当前</p>
                      <p className="text-base font-bold text-emerald-600">{team.level_stats.D}</p>
                    </div>
                  </div>
                )}
                {team.transitions && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>期间转化：</span>
                    <span>A→B: {team.transitions.A_to_B}</span>
                    <span>B→C: {team.transitions.B_to_C}</span>
                    <span>C→D: {team.transitions.C_to_D}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {team.employees.length > 0 ? (
                  <div className="space-y-3">
                    {team.employees.map((emp, index) => {
                      const lv = emp.level_stats ?? { A: 0, B: 0, C: 0, D: 0 };
                      const lvChips: Array<{ key: 'A' | 'B' | 'C' | 'D'; label: string; chip: string; num: string; sub: string }> = [
                        { key: 'A', label: 'A', chip: 'bg-blue-50 text-blue-700 border-blue-200',       num: 'text-blue-700',   sub: 'text-blue-500' },
                        { key: 'B', label: 'B', chip: 'bg-green-50 text-green-700 border-green-200',   num: 'text-green-700', sub: 'text-green-500' },
                        { key: 'C', label: 'C', chip: 'bg-orange-50 text-orange-700 border-orange-200', num: 'text-orange-700', sub: 'text-orange-500' },
                        { key: 'D', label: 'D', chip: 'bg-red-50 text-red-700 border-red-200',         num: 'text-red-700',   sub: 'text-red-500' },
                      ];
                      return (
                      <div key={emp.id} className="rounded-lg border bg-card">
                        <button
                          type="button"
                          className="flex w-full items-start md:items-center gap-3 p-3 md:p-4 text-left hover:bg-muted/30 rounded-lg"
                          onClick={() => toggleEmployee(emp.id)}
                        >
                          <div className={`w-7 h-7 mt-1 md:mt-0 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${getRankStyle(index)}`}>
                            {index + 1}
                          </div>
                          <EmployeeAvatar name={emp.name} src={avatarMap[emp.id]} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                              <p className="text-sm font-medium truncate">{emp.name}</p>
                              <span className="text-xs text-muted-foreground shrink-0">今日 +{emp.today_customers}</span>
                              <span className="text-xs text-muted-foreground shrink-0">累计 {emp.total_customers}</span>
                            </div>

                            {/* 手机端：客户等级独立卡片，靠右 */}
                            <div className="md:hidden mt-2 flex flex-wrap justify-end gap-2">
                              {lvChips.map(c => (
                                <div key={c.key} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${c.chip}`}>
                                  <span className="text-base font-bold leading-none">{c.label}</span>
                                  <span className={`text-lg font-bold leading-none ${c.num}`}>{lv[c.key]}</span>
                                </div>
                              ))}
                            </div>

                            {/* PC 端：保留展开后的明细表头行，避免破坏 */}
                          </div>

                          {/* PC 端：客户等级作为独立卡片，靠右 */}
                          <div className="hidden md:flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground mr-1">客户等级</span>
                            {lvChips.map(c => (
                              <div key={c.key} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${c.chip}`}>
                                <span className="text-base font-bold leading-none">{c.label}</span>
                                <span className={`text-lg font-bold leading-none ${c.num}`}>{lv[c.key]}</span>
                                <span className={`text-[11px] leading-none ${c.sub}`}>+{emp.today_level_stats?.[c.key] ?? 0}</span>
                              </div>
                            ))}
                          </div>

                          <span className="text-xs text-muted-foreground hidden md:inline shrink-0">
                            {expandedEmployees.has(emp.id) ? '收起' : '明细'}
                          </span>
                        </button>
                        {expandedEmployees.has(emp.id) && (
                          <div className="border-t p-3 bg-muted/20 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                              <div className="rounded border p-2"><span className="text-muted-foreground">A类当前</span><div className="font-bold text-blue-600">{emp.level_stats?.A ?? 0}</div></div>
                              <div className="rounded border p-2"><span className="text-muted-foreground">B类当前</span><div className="font-bold text-cyan-600">{emp.level_stats?.B ?? 0}</div></div>
                              <div className="rounded border p-2"><span className="text-muted-foreground">C类当前</span><div className="font-bold text-amber-600">{emp.level_stats?.C ?? 0}</div></div>
                              <div className="rounded border p-2"><span className="text-muted-foreground">D类当前</span><div className="font-bold text-emerald-600">{emp.level_stats?.D ?? 0}</div></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                              <div className="rounded border p-2"><span className="text-muted-foreground">A类期间新增</span><div className="font-bold text-blue-600">+{emp.today_level_stats?.A ?? 0}</div></div>
                              <div className="rounded border p-2"><span className="text-muted-foreground">B类期间新增</span><div className="font-bold text-cyan-600">+{emp.today_level_stats?.B ?? 0}</div></div>
                              <div className="rounded border p-2"><span className="text-muted-foreground">C类期间新增</span><div className="font-bold text-amber-600">+{emp.today_level_stats?.C ?? 0}</div></div>
                              <div className="rounded border p-2"><span className="text-muted-foreground">D类期间新增</span><div className="font-bold text-emerald-600">+{emp.today_level_stats?.D ?? 0}</div></div>
                            </div>
                            <div className="flex flex-wrap gap-3 text-muted-foreground">
                              <span>等级转化：</span>
                              <span>A→B: {emp.transitions?.A_to_B ?? 0}</span>
                              <span>B→C: {emp.transitions?.B_to_C ?? 0}</span>
                              <span>C→D: {emp.transitions?.C_to_D ?? 0}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">暂无员工数据</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无团队数据
          </CardContent>
        </Card>
      )}
    </div>
  );
}
