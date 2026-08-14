'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface EmployeeAvatarProps {
  /** 员工姓名（用于生成默认首字头像） */
  name: string;
  /** 员工头像 URL（presigned URL 或完整 URL） */
  src?: string | null;
  /** 头像尺寸，默认 h-9 w-9 (36px) */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** 额外的 className */
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-9 w-9 text-base',
  lg: 'h-12 w-12 text-lg',
};

/**
 * 统一员工头像组件
 * 
 * 功能：
 * 1. 有真实头像时显示真实头像
 * 2. 没有头像或加载失败时显示姓名首字
 * 3. 图片为空时自动回退到首字头像
 * 4. 图片 URL 失效时不显示破图
 */
export function EmployeeAvatar({ 
  name, 
  src, 
  size = 'md',
  className 
}: EmployeeAvatarProps) {
  // 获取姓名首字作为 fallback
  const fallbackChar = name?.charAt(0) || '?';
  
  // 处理 src：如果为空则传空字符串让 AvatarImage 不渲染
  const avatarSrc = src || '';

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage 
        src={avatarSrc} 
        alt={name || '员工'}
        onError={(e) => {
          // 图片加载失败时隐藏 img 元素，显示 fallback
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
      <AvatarFallback className={cn(
        'bg-primary/10 text-primary font-medium',
        sizeClasses[size]
      )}>
        {fallbackChar}
      </AvatarFallback>
    </Avatar>
  );
}
