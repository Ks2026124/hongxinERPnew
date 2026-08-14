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
    created_at: string;
  }>;
}

interface TeamMember {
  id: number;
  name: string;
  avatar_url: string | null;
  today_customers: number;
  total_customers: number;
}

interface TeamStats {
  team_name: string;
  team_today_customers: number;
  members: TeamMember[];
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
  const [loading, setLoading] = useState(true);

  // 获取团队成员 ID 列表
  const memberIds = useMemo(() => 
    teamStats?.members?.map(m => m.id) || [], 
    [teamStats]
  );
  
  // 批量获取团队成员头像
  const { avatarMap } = useEmployeeAvatars(memberIds);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, teamRes, perfRes] = await Promise.all([
        fetch('/api/employee/stats'),
        fetch('/api/employee/team-stats'),
        fetch('/api/employee/team-performance'),
      ]);
      const statsData = await statsRes.json();
      const teamData = await teamRes.json();
      const perfData = await perfRes.json();
      if (statsData.success) setStats(statsData.data);
      if (teamData.success) setTeamStats(teamData.data);
      if (perfData.success) setTeamPerformance(perfData.data);
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
      hour: '2-digit',
      minute: '2-digit',
    });
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

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日新增客户</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.today_customers ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日上传截图</CardTitle>
            <Image className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.today_images ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本周新增客户</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.week_customers ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累计客户数</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_customers ?? 0}</div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 团队排行榜 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-blue-500" />
              团队排行榜
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {teamStats?.team_name || '我的团队'} - 今日动态
            </p>
          </CardHeader>
          <CardContent>
            {teamStats?.members && teamStats.members.length > 0 ? (
              <div className="space-y-3">
                {teamStats.members.map((member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg border"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${getRankStyle(index)}`}
                    >
                      {index + 1}
                    </div>
                    <EmployeeAvatar 
                      name={member.name} 
                      src={avatarMap[member.id]} 
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        累计 {member.total_customers} 位客户
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">+{member.today_customers}</p>
                      <p className="text-xs text-muted-foreground">今日</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无团队成员数据
              </div>
            )}
          </CardContent>
        </Card>

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
                      <p className="font-medium">{customer.customer_name}</p>
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
      </div>

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
  );
}
