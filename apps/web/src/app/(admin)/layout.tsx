'use client';

import { ConfigProvider, App } from 'antd';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a5c3a',
          borderRadius: 12,
        },
        components: {
          Button: {
            colorPrimary: '#1a5c3a',
            colorPrimaryHover: '#166534',
          },
        },
      }}
    >
      <App>
        {children}
      </App>
    </ConfigProvider>
  );
}
