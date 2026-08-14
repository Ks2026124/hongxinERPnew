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
  today_levels?: LevelStats;
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
    today_levels?: LevelStats;
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">工作台</h1>
        <p className="text-muted-foreground mt-1">欢迎回来，查看您的工作数据</p>
      </div>

      {/* 客户等级统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">A类客户</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats?.level_counts?.A ?? 0}</div>
            <p className="text-xs text-blue-600 mt-1">新增客户</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">B类客户</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats?.level_counts?.B ?? 0}</div>
            <p className="text-xs text-green-600 mt-1">深聊客户</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">C类客户</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{stats?.level_counts?.C ?? 0}</div>
            <p className="text-xs text-orange-600 mt-1">付费意向</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">D类客户</CardTitle>
            <Trophy className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats?.level_counts?.D ?? 0}</div>
            <p className="text-xs text-purple-600 mt-1">成交客户</p>
          </CardContent>
        </Card>
      </div>

      {/* 我的团队客户业绩 */}
      {teamPerformance?.my_team_rank && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              我的团队
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {teamPerformance.my_team_rank.team_name} - 客户业绩
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{teamPerformance.my_team_rank.today_customers}</p>
                <p className="text-sm text-muted-foreground mt-1">今日新增</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{teamPerformance.my_team_rank.total_customers}</p>
                <p className="text-sm text-muted-foreground mt-1">累计客户</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">#{teamPerformance.my_team_rank.rank}</p>
                <p className="text-sm text-muted-foreground mt-1">团队排名</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                    {team.today_levels && (
                      <div className="mb-4 pb-3 border-b">
                        <p className="text-xs text-muted-foreground mb-2">今日客户等级分布</p>
                        <div className="flex gap-2 flex-wrap">
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                            A类 {team.today_levels.A}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                            B类 {team.today_levels.B}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700">
                            C类 {team.today_levels.C}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                            D类 {team.today_levels.D}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 团队成员排行榜 */}
                    {team.members && team.members.length > 0 ? (
                      <div className="space-y-2">
                        {team.members.map((member, index) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-background/50"
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${getRankStyle(index)}`}
                            >
                              {index + 1}
                            </div>
                            <EmployeeAvatar 
                              name={member.name} 
                              src={avatarMap[member.id]} 
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{member.name}</p>
                              <p className="text-xs text-muted-foreground">
                                累计 {member.total_customers} 位
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary text-sm">+{member.today_customers}</p>
                              {member.today_levels && (
                                <p className="text-[10px] text-muted-foreground">
                                  A{member.today_levels.A}|B{member.today_levels.B}|C{member.today_levels.C}|D{member.today_levels.D}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
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
