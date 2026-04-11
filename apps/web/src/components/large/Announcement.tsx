'use client'

import { Bell, ChevronRight, Volume2 } from 'lucide-react'

const announcements = [
  { id: 1, text: '智协平台V2.0正式发布，新增AI绘图和代码助手功能', isNew: true },
  { id: 2, text: '知识库支持批量导入PDF文档，体验更高效的知识管理', isNew: true },
  { id: 3, text: '论文写作功能升级，支持多种学术规范格式', isNew: false },
]

export default function Announcement() {
  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Title */}
            <div className="flex items-center space-x-2 text-primary-600 font-medium">
              <Volume2 className="w-5 h-5" />
              <span>平台公告</span>
            </div>
            
            {/* Announcements Carousel */}
            <div className="flex items-center space-x-3 overflow-hidden">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 cursor-pointer transition-colors whitespace-nowrap"
                >
                  {item.isNew && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded">NEW</span>
                  )}
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* More Link */}
          <a
            href="#"
            className="flex items-center space-x-1 text-gray-400 hover:text-primary-600 text-sm transition-colors"
          >
            <span>更多公告</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
