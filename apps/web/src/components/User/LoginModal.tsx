'use client';
import { Button, Modal, Tabs, Input, Checkbox, Divider } from 'antd';
import { WechatOutlined, GlobalOutlined } from '@ant-design/icons';

interface LoginProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginProps) {
  // 登录点击处理
  const handleLoginClick = () => {
    // 逻辑流：执行登录 -> 父组件感知成功(设置isLoggedIn并关闭弹窗)
    onSuccess();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={420}
      centered
      // 给弹窗加点圆角，配合你的 academic 风格
      styles={{ 
        mask: { backgroundColor: 'rgba(0, 0, 0, 0.15)' },
        body: { borderRadius: '24px', overflow: 'hidden' } 
      }}
    >
      <div className="px-2 pb-2">
        <Tabs
          defaultActiveKey="sms"
          centered
          className="custom-login-tabs"
          items={[
            {
              key: 'sms',
              label: '短信登录',
              children: (
                <div className="pt-6 space-y-5">
                  <Input 
                    prefix={<span className="text-gray-500 font-medium pr-1">+86</span>} 
                    placeholder="请输入手机号" 
                    size="large" 
                    className="rounded-xl"
                  />
                  <div className="flex gap-3">
                    <Input placeholder="验证码" size="large" className="rounded-xl" />
                    <Button size="large" className="rounded-xl">获取验证码</Button>
                  </div>
                  <Button 
                    type="primary" 
                    block 
                    size="large" 
                    className="bg-primary! hover:bg-primary-hover! h-11 text-base mt-2 rounded-xl" 
                    onClick={handleLoginClick}
                  >
                    登 录
                  </Button>
                  <div className="flex items-center text-xs text-gray-500 mt-2">
                    <Checkbox /> 
                    <span className="ml-1">
                      已阅读并同意 <a className="text-gray-400! hover:text-primary!">用户协议</a> 和 <a className="text-gray-400! hover:text-primary!">隐私政策</a>
                    </span>
                  </div>
                </div>
              ),
            },
            {
              key: 'account',
              label: '账号登录',
              children: (
                <div className="pt-6 space-y-5">
                  <div>
                    <Input placeholder="请输入账号/手机号/邮箱" size="large" className="rounded-xl" />
                  </div>
                  <div>
                    <Input.Password placeholder="请输入密码" size="large" className="rounded-xl" />
                  </div>
                  <Button 
                    type="primary" 
                    block 
                    size="large" 
                    className="bg-primary! hover:bg-primary-hover! h-11 text-base mt-2 rounded-xl" 
                    onClick={handleLoginClick}
                  >
                    登 录
                  </Button>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <div className="flex items-center gap-1"><Checkbox /> 保持登录状态</div>
                    <div className="space-x-2">
                      <a className="text-gray-400! hover:text-primary!">找回密码?</a>
                      <span className="text-gray-300">|</span>
                      <a className="text-gray-400! hover:text-primary!">注册</a>
                    </div>
                  </div>
                </div>
              )
            },
          ]}
        />
        <Divider plain className="text-xs text-gray-400 mt-8 mb-4">其他登录方式</Divider>
        <div className="flex justify-center gap-6 pb-2">
          <Button shape="circle" icon={<WechatOutlined className="text-green-600 text-xl"/>} size="large" />
          <Button shape="circle" icon={<GlobalOutlined className="text-blue-500 text-xl"/>} size="large" />
        </div>
      </div>
    </Modal>
  );
}