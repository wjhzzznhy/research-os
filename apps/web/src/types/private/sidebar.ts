import React from 'react';

// 侧边栏导航项接口
export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  authRequired?: boolean;
}

// 侧边栏项组件的 Props (可选提取)
export interface SidebarItemProps {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  onClick: () => void;
}