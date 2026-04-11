'use client'

import { MessageCircle, Smartphone, Headphones, ShoppingCart, Sparkles } from 'lucide-react'

const tools = [
  { icon: Sparkles, label: 'AI问答', color: 'bg-gradient-to-br from-primary-500 to-primary-700' },
  { icon: MessageCircle, label: '在线客服', color: 'bg-blue-500' },
  { icon: Smartphone, label: '手机端', color: 'bg-green-500' },
  { icon: Headphones, label: '客服', color: 'bg-orange-500' },
  { icon: ShoppingCart, label: '体验套餐', color: 'bg-pink-500' },
]

export default function SideToolbar() {
  return (
    <div className="sidebar-tool">
      <div className="flex flex-col items-center space-y-3">
        {tools.map((tool, index) => (
          <div key={index} className="group relative">
            <button
              className={`w-12 h-12 rounded-xl ${tool.color} text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md`}
            >
              <tool.icon className="w-5 h-5" />
            </button>
            {/* Tooltip */}
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
              {tool.label}
              <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Chat Bot Bubble */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          {/* Online indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white pulse-animation" />
          {/* Chat bubble */}
          <div className="absolute right-full mr-3 top-0 w-32 p-2 bg-white rounded-xl shadow-lg text-xs">
            <div className="font-medium text-gray-800">您好，我是</div>
            <div className="text-primary-600 font-bold">智协Chat</div>
            <div className="text-gray-500 mt-1">点击开始对话吧!</div>
          </div>
        </div>
      </div>
    </div>
  )
}
