'use client';
import { Modal, Spin, Avatar, Popover } from 'antd';
import { 
  UserOutlined, 
  ExclamationCircleOutlined, 
  SettingOutlined,
  LogoutOutlined,
  SolutionOutlined,
  HistoryOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useLayout } from '@/context/LayoutContext';
import { useRouter } from 'next/navigation';

export const UserSection = ({ collapsed }: { collapsed: boolean }) => {
  // 从 components/User/LayoutContext 中获取状态和方法
  const { isLoggedIn, isUserLoading, setIsLoginModalOpen, logout } = useLayout();
  // 获取支持 Context 的 modal 实例
  const [modalApi, contextHolder] = Modal.useModal(); 

  const router = useRouter();

  // 模拟用户信息（后续可从 Context 或接口获取）
  const userInfo = {
    name: "科研学者_N",
  };

  const onLogout = () => {
    modalApi.confirm({
      title: '确认退出',
      icon: <ExclamationCircleOutlined />,
      content: '退出登录后，部分功能可能无法使用。',
      okText: '确认退出',
      cancelText: '取消',
      okButtonProps: { 
        danger: true, 
        className: 'rounded-lg border-none hover:bg-red-600!', // 强制去掉边框并加深红色
      },
      onOk: logout,
    });
  };

  // 悬停展开的内容
  const popoverContent = (
    <div className="w-52 py-0.5">
      <div className="flex items-center gap-3 px-3 py-3 bg-gray-50/50 rounded-lg mb-1.5">
        <Avatar size={40} icon={<UserOutlined />} className="border border-gray-200! text-primary! bg-white!" />
        <div className="flex flex-col overflow-hidden">
          <span className="text-[14px] font-bold text-primary-900 truncate leading-tight">
            {userInfo.name}
          </span>
          <span className="text-[11px] text-gray-400">正式版用户 · ID: 2026</span>
        </div>
      </div>
      
      <div className="space-y-0.5">
        {[
          { label: '学术主页', icon: <UserOutlined />, path: '/private' },
          { label: '个人账户', icon: <SolutionOutlined />, path: '/private/account' },
          { label: '我的关注', icon: <StarOutlined />, path: '/private/follow' },
          { label: '浏览历史', icon: <HistoryOutlined />, path: '/private/history' },
        ].map(item => (
          <div 
            key={item.label}
            // onClick={() => router.push(item.path)}
            className="flex items-center gap-2.5 px-3 py-2 text-[14px] font-medium text-gray-700 hover:bg-primary-50 hover:text-primary transition-colors cursor-pointer rounded-lg"
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      
    <div className="mt-1.5 pt-1.5 border-t border-gray-100"> 
      <div 
        onClick={onLogout}
        className="flex items-center gap-2.5 px-3 py-2 text-[14px] text-red-500 hover:bg-red-50 transition-colors cursor-pointer rounded-lg"
      >
        <LogoutOutlined className="text-sm" />
        <span>退出登录</span>
      </div>
    </div>
  </div>
);

  if (isUserLoading) return <div className="p-4 text-center"><Spin size="small" /></div>;

  // 未登录态保持原样或显示简单按钮
  if (!isLoggedIn) {
    return (
      <div className="shrink-0 p-4 border-t border-gray-100 bg-white">
        <button 
          onClick={() => setIsLoginModalOpen(true)}
          className={`
            w-full h-10 rounded-xl flex items-center justify-center transition-all bg-primary text-white hover:opacity-90
            ${collapsed ? 'w-10' : ''}
          `}
        >
          <UserOutlined className={collapsed ? 'text-lg' : 'mr-2'} />
          {!collapsed && <span>登录 / 注册</span>}
        </button>
      </div>
    );
  }

  // 登录态：合二为一的头像按钮
  return (
    <div className="shrink-0 p-4 border-t border-gray-200 bg-white">
      {/* 必须放置这个负责渲染弹窗 DOM 的持有者 */}
      {contextHolder} 
      <Popover 
        content={popoverContent} 
        placement="right"
        trigger="hover" 
        rootClassName="user-popover"
        mouseEnterDelay={0.1}
        // align 属性进行垂直位移； offset: [水平偏移, 垂直偏移] 
        // 这里的 -12 代表让气泡整体向上移动 12 像素，你可以根据视觉效果微调这个值
        align={{
          offset: [10, -12], 
        }}
      >
        <div className={`
          flex items-center rounded-xl p-2 transition-all cursor-pointer hover:bg-gray-50 group
          ${collapsed ? 'justify-center mx-auto' : 'gap-3'}
        `}>
          <Avatar 
            size={collapsed ? 34 : 36} 
            icon={<UserOutlined />} 
            className="bg-white! text-primary! shrink-0 border-2 border-gray-200! shadow-sm"
          />
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="text-sm font-semibold text-primary-900 truncate leading-tight">
                  {userInfo.name}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">正式版用户</span>
              </div>
              <SettingOutlined className="text-gray-300 group-hover:text-primary transition-all text-[15px]" />
            </>
          )}
        </div>
      </Popover>
    </div>
  );
};