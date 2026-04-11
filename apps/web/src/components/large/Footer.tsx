'use client'

import { Sparkles } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">智协平台</h3>
                <span className="text-xs text-gray-400">AI人机协作</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              融合知识管理、智能写作、AI绘图、代码辅助，打造一站式AI协作平台
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-medium mb-4">产品功能</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="hover:text-white cursor-pointer transition-colors">智能知识库</li>
              <li className="hover:text-white cursor-pointer transition-colors">AI写作助手</li>
              <li className="hover:text-white cursor-pointer transition-colors">AI绘图创作</li>
              <li className="hover:text-white cursor-pointer transition-colors">代码智能助手</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">使用帮助</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="hover:text-white cursor-pointer transition-colors">新手指南</li>
              <li className="hover:text-white cursor-pointer transition-colors">常见问题</li>
              <li className="hover:text-white cursor-pointer transition-colors">API文档</li>
              <li className="hover:text-white cursor-pointer transition-colors">更新日志</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">关于我们</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="hover:text-white cursor-pointer transition-colors">团队介绍</li>
              <li className="hover:text-white cursor-pointer transition-colors">联系我们</li>
              <li className="hover:text-white cursor-pointer transition-colors">用户协议</li>
              <li className="hover:text-white cursor-pointer transition-colors">隐私政策</li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-gray-500 text-sm">
            © 2024 智协平台. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span className="text-gray-500 text-sm">技术支持：AI人机协作团队</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
