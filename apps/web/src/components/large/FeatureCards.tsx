'use client'

import { Database, PenTool, Image, Code, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    id: 'knowledge',
    title: '智能知识库',
    description: '导入PDF、文档，智能分析与检索，构建个人专属知识体系',
    icon: Database,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    tags: ['知识导入', '智能检索', '文档管理'],
    isNew: false,
    href: '/projects',
  },
  {
    id: 'writing',
    title: 'AI智能写作',
    description: '论文写作、报告生成、文案创作，AI全程辅助提升写作效率',
    icon: PenTool,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
    tags: ['论文写作', '智能润色', '文案生成'],
    isNew: false,
    href: '/projects',
  },
  {
    id: 'drawing',
    title: 'AI绘图创作',
    description: '文生图、图生图，多种风格自由切换，释放创意无限可能',
    icon: Image,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50',
    tags: ['图像生成', '风格迁移', '创意设计'],
    isNew: true,
    href: '/projects',
  },
  {
    id: 'code',
    title: '代码智能助手',
    description: '代码生成、解释、优化、调试，程序员的AI编程搭档',
    icon: Code,
    color: 'from-green-500 to-teal-500',
    bgColor: 'bg-green-50',
    tags: ['代码生成', '代码优化', '调试助手'],
    isNew: true,
    href: '/projects',
  },
]

export default function FeatureCards() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>核心功能模块</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            一站式AI人机协作平台
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            融合知识管理、智能写作、AI绘图、代码辅助四大核心能力，助力高效创作与学习
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
          const cardContent = (
            <>
              {/* New Badge */}
              {feature.isNew && (
                <span className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                  新
                </span>
              )}

              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-7 h-7 bg-linear-to-br ${feature.color} bg-clip-text`} style={{ color: feature.color.includes('blue') ? '#3b82f6' : feature.color.includes('purple') ? '#8b5cf6' : feature.color.includes('orange') ? '#f97316' : '#10b981' }} />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                {feature.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {feature.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Action */}
              <div className="flex items-center text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>立即体验</span>
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </>
          )
          
          const className = "group relative bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 card-hover cursor-pointer border border-gray-100 block"
          
          return feature.href ? (
            <Link key={feature.id} href={feature.href} className={className}>
              {cardContent}
            </Link>
          ) : (
            <div key={feature.id} className={className}>
              {cardContent}
            </div>
          )
        })}
        </div>

        {/* Banner */}
        <div className="mt-12 relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 p-8">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="text-3xl font-bold text-white">智协AI</div>
              <div className="text-white/90">
                借助AI大模型辅助「论文写作/课题申报」
              </div>
            </div>
            <button className="px-6 py-3 bg-white text-primary-600 font-medium rounded-xl hover:shadow-lg transition-all">
              前往智协AI →
            </button>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-primary-400/20 rounded-full blur-2xl" />
        </div>
      </div>
    </section>
  )
}
