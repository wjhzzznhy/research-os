// app/(main)/layout.tsx
// 管理app/(main)/及其底下所有页面的布局
// 左右结构排版，侧边栏固定，主内容区滚动

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/private/siderbar/Sidebar'; 
import { useLayout } from '@/context/LayoutContext'; // 仅引入钩子
import { App, ConfigProvider } from 'antd';

// 左右排版的容器
function MainFrame({ children }: { children: React.ReactNode }) {
  // 从全局管家直接获取状态，不再依赖父组件传参
  const { collapsed } = useLayout();

  return (
    <ConfigProvider theme={{ 
      token: {
        colorPrimary: '#1a5c3a',       // 锁定主绿色
        // colorLink: '#1a5c3a',          // 修复链接变蓝
        // colorTextBase: '#4b5563',      // 深灰基础文字
        // colorBorder: '#f0f0f0',        // 灰白色边框
        borderRadius: 12,              // 圆角
      },
      components: {
        Input: {
          activeBorderColor: '#e5e7eb',
          // hoverBorderColor: '#e5e7eb',
          // activeShadow: 'none', 
        },
        Checkbox: {
          colorPrimary: '#1a5c3a',   // 勾选框
        },
        Button: {
          colorPrimary: '#1a5c3a',     // 确保登录按钮主色正确
          colorPrimaryHover: '#166534',
        },
        Modal: {
          headerBg: 'transparent',
        }
      },
     }}
    >
      <App>
        <div className="flex h-screen w-full overflow-hidden bg-white">
          {/* 核心修改：Sidebar 内部现在会自己 handle 逻辑，不需要传 props */}
          <Sidebar />
          <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-56'} bg-mesh-green overflow-y-auto`}>
            {children}
          </main>
        </div>
      </App>
    </ConfigProvider>
  );
}

// 项目守卫：没有选择项目时跳转到项目选择页
function ProjectGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const projectId = localStorage.getItem('currentProjectId');
    if (!projectId) {
      router.replace('/projects');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-mesh-green">
        <div className="text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">正在加载...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// 导出最终布局
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectGuard>
      <MainFrame>{children}</MainFrame>
    </ProjectGuard>
  );
}