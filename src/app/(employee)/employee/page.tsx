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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {([
            { key: 'A', label: 'A类客户', sub: '新增客户', color: 'blue', Icon: Users },
            { key: 'B', label: 'B类客户', sub: '深聊客户', color: 'green', Icon: Users },
            { key: 'C', label: 'C类客户', sub: '付费意向', color: 'orange', Icon: TrendingUp },
            { key: 'D', label: 'D类客户', sub: '成交客户', color: 'purple', Icon: Trophy },
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
              <Card key={key} className={c.card}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-xs sm:text-sm font-medium ${c.num}`}>{label}</p>
                      <p className={`text-[11px] sm:text-xs ${c.sub} truncate`}>{sub}</p>
                    </div>
                    <Icon className={`h-4 w-4 ${c.icon} shrink-0`} />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-2xl sm:text-3xl font-bold leading-none ${c.num}`}>{count}</span>
                    <span className={`text-[11px] sm:text-xs ${c.today}`}>今日 +{today}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 3. 今日客户变化（PC 四列紧凑，手机纵向列表） */}
        <Card>
          <CardHeader className="pb-2 px-4 sm:px-6 pt-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              今日客户变化
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 pt-0">
            {/* PC：横向四列，每个等级一行 */}
            <div className="hidden lg:grid grid-cols-4 gap-3">
              {([
                { key: 'A', color: 'blue',   in: stats?.today_new_levels?.A ?? 0,                                          out: stats?.today_transitions?.A_to_B ?? 0 },
                { key: 'B', color: 'green',  in: stats?.today_transitions?.A_to_B ?? 0,                                  out: stats?.today_transitions?.B_to_C ?? 0 },
                { key: 'C', color: 'orange', in: stats?.today_transitions?.B_to_C ?? 0,                                  out: stats?.today_transitions?.C_to_D ?? 0 },
                { key: 'D', color: 'purple', in: stats?.today_transitions?.C_to_D ?? 0,                                  out: 0 },
              ] as const).map(({ key, color, in: inn, out }) => {
                const map: Record<string,string> = {
                  blue:'border-blue-200 text-blue-700 bg-blue-50/40',
                  green:'border-green-200 text-green-700 bg-green-50/40',
                  orange:'border-orange-200 text-orange-700 bg-orange-50/40',
                  purple:'border-purple-200 text-purple-700 bg-purple-50/40',
                };
                return (
                  <div key={key} className={`rounded-md border px-3 py-2 ${map[color]}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{key}类</span>
                      <span className="text-sm font-bold">当前 {stats?.level_counts?.[key] ?? 0}</span>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs">
                      <span className="text-green-600">入 +{inn}</span>
                      {out > 0 && <span className="text-orange-600">出 -{out}</span>}
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
                <div key={key} className="flex items-center justify-between py-2 text-sm">
                  <span className={`font-semibold ${color}`}>{key}类</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-600">入 +{inn}</span>
                    {out > 0 ? <span className="text-orange-600">出 -{out}</span> : <span className="text-muted-foreground/50">出 -0</span>}
                    <span className="font-medium text-foreground min-w-[3.5rem] text-right">当前 {stats?.level_counts?.[key] ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>今日转化</span>
              <span className="text-blue-600">A→B {stats?.today_transitions?.A_to_B ?? 0}</span>
              <span className="text-green-600">B→C {stats?.today_transitions?.B_to_C ?? 0}</span>
              <span className="text-orange-600">C→D {stats?.today_transitions?.C_to_D ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 团队客户排行榜 */}
      {teamPerformance?.all_teams && teamPerformance.all_teams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-blue-500" />
              团队客户排行榜
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              所有团队客户业绩对比
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamPerformance.all_teams.map((team, index) => {
                const isMyTeam = teamPerformance.my_team_rank && team.team_id === teamPerformance.my_team_rank.team_id;
                return (
                  <div
                    key={team.team_id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      isMyTeam
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-sm font-bold">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{team.team_name}</p>
                        {isMyTeam && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            我的团队
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {team.team_code}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div>
                        <p className="text-lg font-bold text-primary">{team.today_customers}</p>
                        <p className="text-xs text-muted-foreground">今日新增</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{team.total_customers}</p>
                        <p className="text-xs text-muted-foreground">累计客户</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 团队排行榜 - 显示所有团队 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-blue-500" />
            团队排行榜
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            查看所有团队的今日动态和业绩对比
          </p>
        </CardHeader>
        <CardContent>
          {allTeamsData?.teams && allTeamsData.teams.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {allTeamsData.teams.map((team) => {
                const isMyTeam = team.team_id === allTeamsData.my_team_id;
                return (
                  <div 
                    key={team.team_id} 
                    className={`rounded-xl border-2 p-4 ${
                      isMyTeam 
                        ? 'border-primary/30 bg-primary/5' 
                        : 'border-border bg-card'
                    }`}
                  >
                    {/* 团队头部 */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{team.team_name}</h3>
                          {isMyTeam && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                              我的团队
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{team.team_code}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">今日新增</p>
                            <p className="text-xl font-bold text-primary">{team.today_customers}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">累计客户</p>
                            <p className="text-xl font-bold">{team.total_customers}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 客户等级统计 */}
                    <div className="mb-4 pb-3 border-b space-y-3">
                      {/* 今日新增 */}
                      {team.today_new_levels && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">今日新增</p>
                          <div className="flex gap-2 flex-wrap">
                            <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 font-medium">
                              A +{team.today_new_levels.A}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 font-medium">
                              B +{team.today_new_levels.B}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-600 font-medium">
                              C +{team.today_new_levels.C}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 font-medium">
                              D +{team.today_new_levels.D}
                            </span>
                          </div>
                        </div>
                      )}
                      {/* 当前客户 */}
                      {team.total_levels && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">当前客户</p>
                          <div className="flex gap-2 flex-wrap">
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                              A {team.total_levels.A}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-medium">
                              B {team.total_levels.B}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 font-medium">
                              C {team.total_levels.C}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">
                              D {team.total_levels.D}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 团队成员排行榜 */}
                    {team.members && team.members.length > 0 ? (
                      <div className="space-y-3">
                        {team.members.map((member, index) => {
                          // 当前登录员工在自己的团队中高亮显示
                          const isCurrentUser = team.team_id === allTeamsData?.my_team_id && 
                            member.name === teamStats?.members.find(m => m.id === member.id)?.name;
                          const lv = member.total_levels ?? { A: 0, B: 0, C: 0, D: 0 };
                          const levelBadges: Array<{ key: 'A' | 'B' | 'C' | 'D'; label: string; chip: string; num: string }> = [
                            { key: 'A', label: 'A', chip: 'bg-blue-50 text-blue-700 border-blue-200',     num: 'text-blue-700' },
                            { key: 'B', label: 'B', chip: 'bg-green-50 text-green-700 border-green-200', num: 'text-green-700' },
                            { key: 'C', label: 'C', chip: 'bg-orange-50 text-orange-700 border-orange-200', num: 'text-orange-700' },
                            { key: 'D', label: 'D', chip: 'bg-red-50 text-red-700 border-red-200',     num: 'text-red-700' },
                          ];
                          return (
                            <div
                              key={member.id}
                              className={`p-3 md:p-4 rounded-lg border ${
                                isCurrentUser
                                  ? 'bg-primary/5 border-primary/20'
                                  : 'bg-background/50 border-border/50'
                              }`}
                            >
                              {/* 第一行（PC）/ 手机端拆成上下两行：左侧身份，右侧等级卡片 */}
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border ${getRankStyle(index)}`}
                                  >
                                    {index + 1}
                                  </div>
                                  <EmployeeAvatar
                                    name={member.name}
                                    src={avatarMap[member.id]}
                                    size="sm"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm truncate">{member.name}</p>
                                      {isCurrentUser && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                                          我
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      累计 {member.total_customers} 位客户
                                    </p>
                                  </div>
                                </div>

                                {/* 客户等级：PC 靠右；手机端独占一行并靠右 */}
                                {member.total_levels && (
                                  <div className="flex md:items-center gap-2 justify-end md:justify-end flex-wrap md:flex-nowrap md:shrink-0">
                                    <span className="hidden md:inline text-xs text-muted-foreground mr-1">客户等级</span>
                                    {levelBadges.map(b => (
                                      <div
                                        key={b.key}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${b.chip}`}
                                      >
                                        <span className="text-base font-bold leading-none">{b.label}</span>
                                        <span className={`text-lg font-bold leading-none ${b.num}`}>{lv[b.key]}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 今日新增 A/B/C/D */}
                              {member.today_new_levels && (
                                <div className="mt-3 pt-2 border-t border-border/30">
                                  <p className="text-[11px] text-muted-foreground mb-1.5">今日新增</p>
                                  <div className="flex gap-2 flex-wrap justify-end md:justify-start">
                                    <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 font-medium">
                                      A +{member.today_new_levels.A}
                                    </span>
                                    <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 font-medium">
                                      B +{member.today_new_levels.B}
                                    </span>
                                    <span className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-600 font-medium">
                                      C +{member.today_new_levels.C}
                                    </span>
                                    <span className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 font-medium">
                                      D +{member.today_new_levels.D}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        暂无团队成员
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              暂无团队数据
            </div>
          )}
        </CardContent>
      </Card>

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
