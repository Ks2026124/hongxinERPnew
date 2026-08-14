'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Image, Trophy, TrendingUp, Clock, Building2 } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employee-avatar';
import { useEmployeeAvatars } from '@/hooks/use-employee-avatars';

interface EmployeeStats {
  today_customers: number;
  today_images: number;
  total_customers: number;
  week_customers: number;
  recent_customers: Array<{
    id: number;
    customer_name: string;
    phone: string | null;
    customer_level?: string;
    created_at: string;
  }>;
  level_counts: LevelStats;
  today_new_levels: LevelStats;
  transitions: {
    A_to_B: number;
    B_to_C: number;
    C_to_D: number;
  };
  today_transitions: {
    A_to_B: number;
    B_to_C: number;
    C_to_D: number;
  };
}

interface LevelStats {
  A: number;
  B: number;
  C: number;
  D: number;
}

interface TeamMember {
  id: number;
  name: string;
  avatar_url: string | null;
  today_customers: number;
  total_customers: number;
  today_new_levels?: LevelStats;
  total_levels?: LevelStats;
}

interface TeamStats {
  team_name: string;
  team_today_customers: number;
  members: TeamMember[];
}

interface AllTeamsData {
  my_team_id: number | null;
  teams: Array<{
    team_id: number;
    team_name: string;
    team_code: string;
    today_customers: number;
    total_customers: number;
    today_new_levels?: LevelStats;
    total_levels?: LevelStats;
    members: TeamMember[];
  }>;
}

interface TeamPerformance {
  team_id: number;
  team_name: string;
  team_code: string;
  today_customers: number;
  total_customers: number;
  rank: number;
}

interface TeamPerformanceData {
  my_team_id: number;
  my_team_rank: TeamPerformance | null;
  all_teams: TeamPerformance[];
}

export default function EmployeeDashboard() {
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformanceData | null>(null);
  const [allTeamsData, setAllTeamsData] = useState<AllTeamsData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取所有团队成员 ID 列表（用于批量获取头像）
  const memberIds = useMemo(() => {
    if (!allTeamsData?.teams) return [];
    const ids: number[] = [];
    for (const team of allTeamsData.teams) {
      for (const member of team.members) {
        ids.push(member.id);
      }
    }
    return ids;
  }, [allTeamsData]);
  
  // 批量获取团队成员头像
  const { avatarMap } = useEmployeeAvatars(memberIds);

  useEffect(() => {
    fetchData();
  }, []);

  // 加载当前登录员工信息（仅用于在排行榜中高亮“我”，不影响统计数据）
  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (active && u && typeof u.id === 'number') setCurrentUserId(u.id);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, teamRes, perfRes, allTeamsRes] = await Promise.all([
        fetch('/api/employee/stats'),
        fetch('/api/employee/team-stats'),
        fetch('/api/employee/team-performance'),
        fetch('/api/employee/all-teams-stats'),
      ]);
      const statsData = await statsRes.json();
      const teamData = await teamRes.json();
      const perfData = await perfRes.json();
      const allTeamsDataRes = await allTeamsRes.json();
      if (statsData.success) setStats(statsData.data);
      if (teamData.success) setTeamStats(teamData.data);
      if (perfData.success) setTeamPerformance(perfData.data);
      if (allTeamsDataRes.success) setAllTeamsData(allTeamsDataRes.data);
    } catch (err) {
      console.error('获取数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 客户等级徽章
  const getLevelBadge = (level?: string) => {
    const badges: Record<string, { text: string; className: string }> = {
      A: { text: 'A类', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      B: { text: 'B类', className: 'bg-green-100 text-green-700 border-green-200' },
      C: { text: 'C类', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      D: { text: 'D类', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    };
    const badge = badges[level || 'A'] || badges.A;
    return <span className={`text-xs px-1.5 py-0.5 rounded border ${badge.className}`}>{badge.text}</span>;
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

  return (
    <div className="space-y-4 lg:space-y-5">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold">工作台</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">欢迎回来，查看您的工作数据</p>
      </div>

      <div className="space-y-3 lg:space-y-4">
        {/* 1. 我的团队（紧凑单行，手机端一行三列数据） */}
        {teamPerformance?.my_team_rank && (
          <Card className="border-primary/20 py-0">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground leading-tight">我的团队</p>
                    <p className="text-sm font-semibold truncate max-w-[8rem] sm:max-w-none">
                      {teamPerformance.my_team_rank.team_name}
                    </p>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-bold text-primary leading-tight">
                      {teamPerformance.my_team_rank.today_customers}
                    </p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">今日新增</p>
                  </div>
                  <div className="text-center border-x">
                    <p className="text-lg sm:text-xl font-bold leading-tight">
                      {teamPerformance.my_team_rank.total_customers}
                    </p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">累计客户</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-bold text-yellow-600 leading-tight">
                      #{teamPerformance.my_team_rank.rank}
                    </p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">团队排名</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. 客户等级统计（PC 四列紧凑卡片，手机 2×2） */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {([
            { key: 'A', label: 'A类', sub: '新增', color: 'blue', Icon: Users },
            { key: 'B', label: 'B类', sub: '深聊', color: 'green', Icon: Users },
            { key: 'C', label: 'C类', sub: '意向', color: 'orange', Icon: TrendingUp },
            { key: 'D', label: 'D类', sub: '成交', color: 'purple', Icon: Trophy },
          ] as const).map(({ key, label, sub, color, Icon }) => {
            const colorMap: Record<string, { card: string; num: string; sub: string; today: string; icon: string }> = {
              blue:   { card: 'bg-blue-50/60 border-blue-200',   num: 'text-blue-700',   sub: 'text-blue-600/80',   today: 'text-blue-600',   icon: 'text-blue-600' },
              green:  { card: 'bg-green-50/60 border-green-200', num: 'text-green-700',  sub: 'text-green-600/80',  today: 'text-green-600',  icon: 'text-green-600' },
              orange: { card: 'bg-orange-50/60 border-orange-200', num: 'text-orange-700', sub: 'text-orange-600/80', today: 'text-orange-600', icon: 'text-orange-600' },
              purple: { card: 'bg-purple-50/60 border-purple-200', num: 'text-purple-700', sub: 'text-purple-600/80', today: 'text-purple-600', icon: 'text-purple-600' },
            };
            const c = colorMap[color];
            const count = stats?.level_counts?.[key] ?? 0;
            const today = stats?.today_new_levels?.[key] ?? 0;
            return (
              <div key={key} className={`rounded-md border px-3 py-2 flex items-center justify-between gap-2 ${c.card}`}>
                <div className="min-w-0">
                  <p className={`text-[11px] lg:text-xs font-semibold ${c.num}`}>
                    <Icon className="inline h-3 w-3 mr-1 -mt-0.5" />
                    {label}
                    <span className={`ml-1 font-normal ${c.sub}`}>· {sub}</span>
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className={`text-xl lg:text-2xl font-bold leading-none ${c.num}`}>{count}</span>
                    <span className={`text-[10px] lg:text-[11px] ${c.today}`}>今日 +{today}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. 今日客户变化（PC 横向单行，手机纵向列表） */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                今日客户变化
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>转化</span>
                <span className="text-blue-600">A→B {stats?.today_transitions?.A_to_B ?? 0}</span>
                <span className="text-green-600">B→C {stats?.today_transitions?.B_to_C ?? 0}</span>
                <span className="text-orange-600">C→D {stats?.today_transitions?.C_to_D ?? 0}</span>
              </div>
            </div>
            {/* PC：横向四列 */}
            <div className="hidden lg:grid grid-cols-4 gap-2">
              {([
                { key: 'A', color: 'blue',   in: stats?.today_new_levels?.A ?? 0,            out: stats?.today_transitions?.A_to_B ?? 0 },
                { key: 'B', color: 'green',  in: stats?.today_transitions?.A_to_B ?? 0,    out: stats?.today_transitions?.B_to_C ?? 0 },
                { key: 'C', color: 'orange', in: stats?.today_transitions?.B_to_C ?? 0,    out: stats?.today_transitions?.C_to_D ?? 0 },
                { key: 'D', color: 'purple', in: stats?.today_transitions?.C_to_D ?? 0,    out: 0 },
              ] as const).map(({ key, color, in: inn, out }) => {
                const map: Record<string,string> = {
                  blue:'border-blue-200 text-blue-700 bg-blue-50/40',
                  green:'border-green-200 text-green-700 bg-green-50/40',
                  orange:'border-orange-200 text-orange-700 bg-orange-50/40',
                  purple:'border-purple-200 text-purple-700 bg-purple-50/40',
                };
                return (
                  <div key={key} className={`rounded-md border px-3 py-1.5 flex items-center justify-between ${map[color]}`}>
                    <span className="text-xs font-semibold">{key}类</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-green-600">+{inn}</span>
                      <span className="text-orange-600">-{out}</span>
                      <span className="text-foreground font-medium">当前{stats?.level_counts?.[key] ?? 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* 手机：纵向紧凑列表 */}
            <div className="lg:hidden divide-y">
              {([
                { key: 'A', color: 'text-blue-700',   in: stats?.today_new_levels?.A ?? 0,        out: stats?.today_transitions?.A_to_B ?? 0 },
                { key: 'B', color: 'text-green-700',  in: stats?.today_transitions?.A_to_B ?? 0,  out: stats?.today_transitions?.B_to_C ?? 0 },
                { key: 'C', color: 'text-orange-700', in: stats?.today_transitions?.B_to_C ?? 0,  out: stats?.today_transitions?.C_to_D ?? 0 },
                { key: 'D', color: 'text-purple-700', in: stats?.today_transitions?.C_to_D ?? 0,  out: 0 },
              ] as const).map(({ key, color, in: inn, out }) => (
                <div key={key} className="flex items-center justify-between py-1.5 text-sm">
                  <span className={`font-semibold ${color}`}>{key}类</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-600">入 +{inn}</span>
                    <span className="text-orange-600">出 -{out}</span>
                    <span className="font-medium text-foreground min-w-[3.5rem] text-right">当前 {stats?.level_counts?.[key] ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 团队排行榜 - 显示所有团队及成员详细排行 */}
      {allTeamsData?.teams && allTeamsData.teams.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-blue-500" />
              团队排行榜
            </CardTitle>
            <p className="text-xs text-muted-foreground">所有团队业绩与成员 A/B/C/D 明细对比</p>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4 pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {allTeamsData.teams.map((team, tIdx) => {
                const isMyTeam = team.team_id === allTeamsData.my_team_id;
                return (
                  <div
                    key={team.team_id}
                    className={`rounded-md border p-3 sm:p-4 ${
                      isMyTeam ? 'border-blue-200 bg-blue-50/50' : 'border-border bg-background'
                    }`}
                  >
                    {/* 团队头部（紧凑） */}
                    <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-border/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-[11px] font-bold shrink-0">
                          {tIdx + 1}
                        </span>
                        <h3 className="font-bold text-sm truncate">{team.team_name}</h3>
                        {isMyTeam && (
                          <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-px rounded shrink-0">我</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                        <span>今日 <b className="text-foreground">{team.today_customers}</b></span>
                        <span>累计 <b className="text-foreground">{team.total_customers}</b></span>
                      </div>
                    </div>

                    {/* 团队等级合计 */}
                    {team.total_levels && (
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        {(['A','B','C','D'] as const).map((lv) => {
                          const chip =
                            lv === 'A' ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : lv === 'B' ? 'bg-green-50 text-green-700 border-green-200'
                            : lv === 'C' ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200';
                          return (
                            <span key={lv} className={`inline-flex items-baseline gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${chip}`}>
                              <span>{lv}</span>
                              <span>{team.total_levels?.[lv] ?? 0}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* 成员详细排行 */}
                    {team.members && team.members.length > 0 ? (
                      <div className="space-y-1.5">
                        {team.members.map((member, mIdx) => {
                          const lv = member.total_levels ?? { A: 0, B: 0, C: 0, D: 0 };
                          const isMe = team.team_id === allTeamsData.my_team_id && member.id === currentUserId;
                          return (
                            <div
                              key={member.id}
                              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded-md border ${
                                isMe ? 'bg-blue-50/70 border-blue-200' : 'bg-muted/20 border-border/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted-foreground/15 text-muted-foreground text-[10px] font-bold shrink-0">
                                  {mIdx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-semibold truncate">{member.name}</p>
                                    {isMe && (
                                      <span className="text-[10px] font-bold text-blue-600">我</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    今日 <b className="text-foreground">{member.today_customers}</b>
                                    <span className="mx-1">·</span>
                                    累计 <b className="text-foreground">{member.total_customers}</b>
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 sm:justify-end flex-wrap">
                                {(['A','B','C','D'] as const).map((k) => {
                                  const chip =
                                    k === 'A' ? 'bg-blue-50 text-blue-700'
                                    : k === 'B' ? 'bg-green-50 text-green-700'
                                    : k === 'C' ? 'bg-orange-50 text-orange-700'
                                    : 'bg-purple-50 text-purple-700';
                                  return (
                                    <span key={k} className={`inline-flex items-baseline gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold ${chip}`}>
                                      <span>{k}</span>
                                      <span>{lv[k]}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center py-3 text-muted-foreground text-xs">暂无团队成员</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近添加的客户 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              最近添加的客户
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recent_customers && stats.recent_customers.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{customer.customer_name}</p>
                        {getLevelBadge(customer.customer_level)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {customer.phone || '无手机号'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(customer.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无客户数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* 团队今日统计 */}
        {teamStats && (
          <Card>
            <CardHeader>
              <CardTitle>团队今日新增</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {teamStats.team_today_customers}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {teamStats.team_name} 今日共新增客户
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
