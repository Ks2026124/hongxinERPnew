'use client';

import { useEffect } from 'react';

export function PWAHead() {
  useEffect(() => {
    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker 注册成功:', registration.scope);
        })
        .catch((error) => {
          console.log('[PWA] Service Worker 注册失败:', error);
        });
    }
  }, []);

  return null;
}
