'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Image, Trophy, TrendingUp, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

export default function EmployeeDashboard() {
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, teamRes] = await Promise.all([
        fetch('/api/employee/stats'),
        fetch('/api/employee/team-stats'),
      ]);
      const statsData = await statsRes.json();
      const teamData = await teamRes.json();
      if (statsData.success) setStats(statsData.data);
      if (teamData.success) setTeamStats(teamData.data);
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
    if (index === 0) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    if (index === 1) return 'bg-gray-400/10 text-gray-600 border-gray-400/20';
    if (index === 2) return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    return 'bg-muted text-muted-foreground border-border';
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 团队排行榜 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
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
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.avatar_url || ''} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
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
