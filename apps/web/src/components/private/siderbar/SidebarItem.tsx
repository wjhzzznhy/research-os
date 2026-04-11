import { Tooltip } from 'antd';
import { NavItem } from '@/types/private/sidebar';

// 定义具体的接口，解决 any 的报错警告
interface NavButtonProps {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  onClick: () => void;
}

// 导出导航栏的具体组件样式
export const SidebarItem = ({ item, collapsed, isActive, onClick }: NavButtonProps) => {
  return (
    <Tooltip title={collapsed ? item.label : ""} placement="right">
      <button
        onClick={onClick}
        className={`
          w-full flex items-center transition-all duration-200
          text-[14px] py-2 rounded-lg group
          ${collapsed ? 'justify-center px-0' : 'px-3 gap-3'}
          ${isActive ? 'bg-[#eafdf0f7]! text-primary! font-bold' : 'text-gray-600 hover:text-primary'}
        `}
      >
        <span className={`text-xl flex items-center transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}>
          {item.icon}
        </span>
        {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
      </button>
    </Tooltip>
  );
};