'use client'

import { useState } from 'react'
import { Send, Sparkles, Zap, MessageSquare } from 'lucide-react'

const quickActions = [
  '帮我推荐【人工智能在线教育领域应用】相关的研究方向',
  '我是一名教育学专业本科生，正在撰写一篇本科学位论文',
  '请帮我总结这篇论文的核心观点和创新之处',
]

export default function HeroSection() {
  const [inputValue, setInputValue] = useState('')

  return (
    <section className="hero-gradient py-10 px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-2">
          AI人机协作智能平台
        </h1>
        <p className="text-white/80 text-center text-base mb-6">
          融合知识库、智能写作、AI绘图、代码辅助，开启高效创作之旅
        </p>

        {/* Chat Input Area */}
        <div className="bg-white rounded-2xl shadow-2xl p-2 mb-4">
          <div className="flex items-center">
            <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl mr-3">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">智协Chat</span>
              <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs text-white">DeepSeek版</span>
            </div>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入您的问题，让AI为您服务..."
              className="flex-1 px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none text-base"
            />
            <button className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-xl hover:shadow-lg transition-all">
              <span>发送</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => setInputValue(action)}
              className="w-full text-left px-4 py-2 bg-white/10 hover:bg-white/20 text-white/90 rounded-xl transition-all text-sm backdrop-blur-sm border border-white/10"
            >
              <div className="flex items-start space-x-3">
                <MessageSquare className="w-4 h-4 mt-0.5 text-white/60" />
                <span>{action}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {['智能选词', '选题门诊', '智能投稿', '论文写作'].map((tag, i) => (
            <span
              key={i}
              className="px-4 py-2 bg-white/20 text-white rounded-full text-sm backdrop-blur-sm border border-white/20 hover:bg-white/30 cursor-pointer transition-all"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Floating AI Button */}
      <div className="absolute top-8 right-8 flex flex-col items-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <span className="text-white/80 text-xs">AI工具</span>
      </div>
    </section>
  )
}
