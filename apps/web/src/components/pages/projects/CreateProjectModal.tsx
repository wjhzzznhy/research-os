'use client';

import { useState } from 'react';
import {
  CloseOutlined,
  ExperimentOutlined,
  BookOutlined,
  FolderOutlined,
  TeamOutlined,
  EditOutlined,
  CodeOutlined,
  ReadOutlined,
  HighlightOutlined,
  CheckOutlined,
} from '@ant-design/icons';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description: string;
    type: 'research' | 'course' | 'personal' | 'team';
    modules: string[];
  }) => void;
}

const PROJECT_TYPES = [
  { key: 'research' as const, label: '科研项目', desc: '论文、实验、课题研究', icon: <ExperimentOutlined />, color: '#3b82f6' },
  { key: 'course' as const, label: '课程项目', desc: '课程作业、大作业', icon: <BookOutlined />, color: '#f59e0b' },
  { key: 'personal' as const, label: '个人项目', desc: '个人学习与兴趣探索', icon: <FolderOutlined />, color: '#10b981' },
  { key: 'team' as const, label: '团队项目', desc: '多人协作、组会资料', icon: <TeamOutlined />, color: '#8b5cf6' },
];

const MODULE_OPTIONS = [
  { key: 'writing', label: 'AI 写作', desc: '论文、报告撰写', icon: <EditOutlined /> },
  { key: 'code', label: 'AI 代码', desc: 'Python 编程辅助', icon: <CodeOutlined /> },
  { key: 'reading', label: 'AI 阅读', desc: '文献阅读与笔记', icon: <ReadOutlined /> },
  { key: 'drawing', label: 'AI 绘图', desc: '图表、示意图生成', icon: <HighlightOutlined /> },
  { key: 'knowledge', label: '知识库', desc: '文档管理与检索', icon: <BookOutlined /> },
];

export default function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'research' | 'course' | 'personal' | 'team'>('research');
  const [modules, setModules] = useState<string[]>(['writing', 'code']);

  const toggleModule = (key: string) => {
    setModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const canProceed = step === 1 ? name.trim().length > 0 : modules.length > 0;

  const handleSubmit = () => {
    if (!canProceed) return;
    if (step === 1) {
      setStep(2);
      return;
    }
    onCreate({ name: name.trim(), description: description.trim(), type, modules });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">新建项目</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 1 ? '步骤 1/2 · 基本信息' : '步骤 2/2 · 选择功能模块'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <CloseOutlined style={{ fontSize: '12px' }} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-primary/80" />
            <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-primary/80' : 'bg-gray-200'}`} />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {step === 1 ? (
            <div className="space-y-5">
              {/* Project name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">项目名称 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：深度学习研究"
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-primary/40 focus:shadow-sm transition-all placeholder-gray-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  项目描述 <span className="text-gray-400 font-normal">(可选)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简要描述你的项目目标和内容..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-primary/40 focus:shadow-sm transition-all resize-none placeholder-gray-400"
                />
              </div>

              {/* Project type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">项目类型</label>
                <div className="grid grid-cols-2 gap-2">
                  {PROJECT_TYPES.map((pt) => (
                    <button
                      key={pt.key}
                      onClick={() => setType(pt.key)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                        type === pt.key
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs shrink-0"
                        style={{ background: pt.color }}
                      >
                        {pt.icon}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${type === pt.key ? 'text-primary' : 'text-gray-700'}`}>
                          {pt.label}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">{pt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                为「<span className="font-medium text-gray-700">{name}</span>」选择需要使用的功能模块：
              </p>
              <div className="space-y-2">
                {MODULE_OPTIONS.map((mod) => {
                  const selected = modules.includes(mod.key);
                  return (
                    <button
                      key={mod.key}
                      onClick={() => toggleModule(mod.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                        selected
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {mod.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-gray-700'}`}>
                          {mod.label}
                        </p>
                        <p className="text-[11px] text-gray-400">{mod.desc}</p>
                      </div>
                      {selected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <CheckOutlined style={{ fontSize: '10px', color: '#fff' }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              上一步
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              取消
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canProceed}
            className="px-5 py-2 text-sm font-medium text-white rounded-xl transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            style={{ background: canProceed ? 'linear-gradient(135deg, #1a5c3a 0%, #166534 100%)' : '#d1d5db' }}
          >
            {step === 1 ? '下一步' : '创建项目'}
          </button>
        </div>
      </div>
    </div>
  );
}
