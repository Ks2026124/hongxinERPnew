import { useState, useEffect } from 'react';

/**
 * 批量获取员工头像 URL 的 Hook
 * 
 * @param employeeIds 员工 ID 数组
 * @returns 员工 ID -> 头像 URL 的映射
 */
export function useEmployeeAvatars(employeeIds: number[]) {
  const [avatarMap, setAvatarMap] = useState<Record<number, string | null>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 过滤有效的 ID
    const validIds = employeeIds.filter(id => id && !isNaN(id));
    
    if (validIds.length === 0) {
      setAvatarMap({});
      return;
    }

    const fetchAvatars = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/employee/avatar?ids=${validIds.join(',')}`);
        const data = await response.json();
        
        if (data.success) {
          setAvatarMap(data.data || {});
        }
      } catch (error) {
        console.error('获取员工头像失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvatars();
  }, [employeeIds.join(',')]); // 使用 join 作为依赖，避免数组引用变化导致重复请求

  return { avatarMap, loading };
}
