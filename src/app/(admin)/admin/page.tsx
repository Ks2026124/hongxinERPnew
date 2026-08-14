'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, TrendingUp, Trophy } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employee-avatar';
import { useEmployeeAvatars } from '@/hooks/use-employee-avatars';
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

  // 获取所有员工 ID
  const allEmployeeIds = useMemo(() => {
    if (!stats?.teams) return [];
    return stats.teams.flatMap(t => t.employees.map(e => e.id));
  }, [stats]);

  // 批量获取员工头像
  const { avatarMap } = useEmployeeAvatars(allEmployeeIds);

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
                        <EmployeeAvatar 
                          name={emp.name} 
                          src={avatarMap[emp.id]} 
                          size="sm"
                        />
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
