'use client'; 

import { ConfigProvider, App as AntdApp } from 'antd';
import { LayoutProvider, useLayout } from '@/context/LayoutContext';
import { HistoryProvider } from '@/context/HistoryContext';
import LoginModal from '@/components/User/LoginModal';

// 内部弹窗组件
function GlobalLogin() {
  const { isLoginModalOpen, setIsLoginModalOpen, login, adminLogin } = useLayout();
  return (
    <LoginModal 
      isOpen={isLoginModalOpen} 
      onClose={() => setIsLoginModalOpen(false)} 
      onSuccess={login}
      onAdminSuccess={adminLogin}
    />
  );
}

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
    theme={{
        token: {
        colorPrimary: '#1a5c3a',
        borderRadius: 12,
        colorLink: '#1a5c3a', 
        },
        components: {
        Modal: {
            // 专门给 Modal 加圆角和边距，不影响外面
            borderRadiusLG: 24,
        }
        }
    }}
    >
      {/* 使用 AntdApp 包裹可以顺便解决 Modal.confirm 样式不跟随的问题 */}
      <AntdApp> 
        <LayoutProvider>
          <HistoryProvider> 
            {children}
            <GlobalLogin />
          </HistoryProvider>
        </LayoutProvider>
      </AntdApp>
    </ConfigProvider>
  );
}