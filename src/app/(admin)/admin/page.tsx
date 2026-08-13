'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, TrendingUp, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TeamEmployee {
  id: number;
  name: string;
  avatar_url: string | null;
  today_customers: number;
  total_customers: number;
}

interface TeamStat {
  id: number;
  team_name: string;
  team_code: string;
  today_customers: number;
  total_customers: number;
  employees: TeamEmployee[];
}

interface AdminStats {
  teams: TeamStat[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error('获取统计失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (index === 1) return 'bg-blue-400/10 text-blue-500 border-blue-400/20';
    if (index === 2) return 'bg-blue-300/10 text-blue-500 border-blue-300/20';
    return 'bg-muted text-muted-foreground border-border';
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管理员工作台</h1>
        <p className="text-muted-foreground mt-1">全局数据概览</p>
      </div>

      {/* 总览卡片 */}
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
                <p className="text-sm text-muted-foreground">
                  今日新增 <span className="font-bold text-primary">{team.today_customers}</span> 位客户
                  {' · '}累计 {team.total_customers} 位
                </p>
              </CardHeader>
              <CardContent>
                {team.employees.length > 0 ? (
                  <div className="space-y-2">
                    {team.employees.map((emp, index) => (
                      <div
                        key={emp.id}
                        className="flex items-center gap-3 p-2 rounded-lg border"
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${getRankStyle(index)}`}
                        >
                          {index + 1}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={emp.avatar_url || ''} />
                          <AvatarFallback className="text-xs">{emp.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{emp.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">+{emp.today_customers}</p>
                          <p className="text-xs text-muted-foreground">累计 {emp.total_customers}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    暂无员工数据
                  </div>
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
