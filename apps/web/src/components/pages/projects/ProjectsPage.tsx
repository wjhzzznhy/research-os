'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  PlusOutlined,
  SearchOutlined,
  FolderOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  StarOutlined,
  StarFilled,
  TeamOutlined,
  FileTextOutlined,
  CodeOutlined,
  ReadOutlined,
  HighlightOutlined,
  BookOutlined,
  ExperimentOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import CreateProjectModal from './CreateProjectModal';

export interface Project {
  id: string;
  name: string;
  description: string;
  type: 'research' | 'course' | 'personal' | 'team';
  updatedAt: string;
  createdAt: string;
  starred: boolean;
  modules: string[];
  fileCount: number;
  memberCount: number;
  color: string;
}

const TYPE_MAP: Record<Project['type'], { label: string; icon: React.ReactNode; bg: string }> = {
  research: { label: '科研项目', icon: <ExperimentOutlined />, bg: 'bg-blue-50 text-blue-600' },
  course: { label: '课程项目', icon: <BookOutlined />, bg: 'bg-amber-50 text-amber-600' },
  personal: { label: '个人项目', icon: <FolderOutlined />, bg: 'bg-green-50 text-green-700' },
  team: { label: '团队项目', icon: <TeamOutlined />, bg: 'bg-purple-50 text-purple-600' },
};

const MODULE_ICON: Record<string, React.ReactNode> = {
  writing: <EditOutlined />,
  code: <CodeOutlined />,
  reading: <ReadOutlined />,
  drawing: <HighlightOutlined />,
  knowledge: <BookOutlined />,
};

const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: '智能客服系统设计',
    description: '基于大语言模型的智能客服系统，包含意图识别、多轮对话和知识库检索的完整方案',
    type: 'research',
    updatedAt: '2026-03-19 15:30',
    createdAt: '2026-01-10',
    starred: true,
    modules: ['writing', 'code', 'reading'],
    fileCount: 47,
    memberCount: 3,
    color: '#3b82f6',
  },
  {
    id: 'proj-2',
    name: '深度学习课程大作业',
    description: '课程项目：使用 PyTorch 实现图像分类模型，包含数据增强、模型训练和可视化分析',
    type: 'course',
    updatedAt: '2026-03-18 09:12',
    createdAt: '2026-02-20',
    starred: false,
    modules: ['code', 'writing'],
    fileCount: 23,
    memberCount: 1,
    color: '#f59e0b',
  },
  {
    id: 'proj-3',
    name: '毕业论文 - 推荐系统优化',
    description: '毕业论文写作项目，研究基于用户行为分析的个性化推荐算法，含文献综述和实验数据',
    type: 'research',
    updatedAt: '2026-03-17 21:45',
    createdAt: '2025-09-01',
    starred: true,
    modules: ['writing', 'reading', 'knowledge', 'drawing'],
    fileCount: 86,
    memberCount: 1,
    color: '#8b5cf6',
  },
  {
    id: 'proj-4',
    name: '电商数据分析工具',
    description: '个人项目，用 Python + Pandas 分析电商平台销售数据，自动生成报表和可视化图表',
    type: 'personal',
    updatedAt: '2026-03-15 14:20',
    createdAt: '2026-03-01',
    starred: false,
    modules: ['code'],
    fileCount: 12,
    memberCount: 1,
    color: '#10b981',
  },
  {
    id: 'proj-5',
    name: 'AI 产品团队协作空间',
    description: '团队共享的 AI 产品设计文档、竞品分析报告和技术调研资料，多人协作编辑',
    type: 'team',
    updatedAt: '2026-03-14 10:00',
    createdAt: '2025-10-15',
    starred: false,
    modules: ['reading', 'knowledge', 'writing'],
    fileCount: 134,
    memberCount: 8,
    color: '#ec4899',
  },
];

type SortKey = 'updatedAt' | 'name' | 'createdAt';
type ViewMode = 'grid' | 'list';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('updatedAt');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCreate, setShowCreate] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = projects;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'zh');
      if (sortBy === 'createdAt') return b.createdAt.localeCompare(a.createdAt);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    // Starred first
    const starred = list.filter((p) => p.starred);
    const rest = list.filter((p) => !p.starred);
    return [...starred, ...rest];
  }, [projects, search, sortBy]);

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, starred: !p.starred } : p))
    );
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setMenuOpenId(null);
  };

  const handleProjectClick = (proj: Project) => {
    // Navigate to /private as the personal homepage for this project
    // In the future, could store selected project in context
    localStorage.setItem('currentProjectId', proj.id);
    localStorage.setItem('currentProjectName', proj.name);
    router.push('/private');
  };

  const handleCreateProject = (data: { name: string; description: string; type: Project['type']; modules: string[] }) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: data.name,
      description: data.description,
      type: data.type,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      createdAt: new Date().toISOString().slice(0, 10),
      starred: false,
      modules: data.modules,
      fileCount: 0,
      memberCount: 1,
      color: data.type === 'research' ? '#3b82f6' : data.type === 'course' ? '#f59e0b' : data.type === 'team' ? '#8b5cf6' : '#10b981',
    };
    setProjects((prev) => [newProj, ...prev]);
    setShowCreate(false);
    // Auto-navigate to new project
    setTimeout(() => handleProjectClick(newProj), 200);
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-mesh-green">
      {/* Standalone page header with logo */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 relative shrink-0">
              <Image src="/favicon.svg" alt="Logo" fill priority className="object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-primary leading-tight">智协平台</span>
              <span className="text-[10px] text-gray-400 leading-tight">选择项目</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
          >
            <HomeOutlined style={{ fontSize: '12px' }} />
            <span>返回主页</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">我的项目</h1>
          <p className="text-sm text-gray-500">选择一个项目开始工作，或创建新项目</p>
        </div>

        {/* Toolbar: search + sort + view + new */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white focus-within:border-primary/40 focus-within:shadow-sm transition-all">
              <SearchOutlined style={{ color: '#9ca3af', fontSize: '14px' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索项目名称或描述..."
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400"
              />
            </div>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-600 outline-none cursor-pointer hover:border-gray-300 transition-colors"
          >
            <option value="updatedAt">最近更新</option>
            <option value="createdAt">创建时间</option>
            <option value="name">名称排序</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <AppstoreOutlined />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <UnorderedListOutlined />
            </button>
          </div>

          {/* New project */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl transition-all hover:shadow-md active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #1a5c3a 0%, #166534 100%)' }}
          >
            <PlusOutlined />
            <span>新建项目</span>
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-6 text-xs text-gray-400">
          <span>共 {projects.length} 个项目</span>
          <span>·</span>
          <span>{projects.filter((p) => p.starred).length} 个星标</span>
          {search && (
            <>
              <span>·</span>
              <span>筛选结果 {filtered.length} 个</span>
            </>
          )}
        </div>

        {/* Project grid / list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <FolderOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <p className="text-base mb-1">
              {search ? '没有找到匹配的项目' : '还没有项目'}
            </p>
            <p className="text-sm">
              {search ? '请尝试其他搜索关键词' : '点击"新建项目"开始你的科研之旅'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {/* New project card */}
            <button
              onClick={() => setShowCreate(true)}
              className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary/40 bg-white/60 hover:bg-primary/5 transition-all duration-200 cursor-pointer min-h-[200px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                <PlusOutlined style={{ fontSize: '20px' }} className="text-gray-400 group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-medium text-gray-500 group-hover:text-primary transition-colors">
                新建项目
              </span>
            </button>

            {/* Project cards */}
            {filtered.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handleProjectClick(proj)}
                className="group relative rounded-2xl border border-gray-100 bg-white hover:shadow-lg hover:border-gray-200 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                {/* Top accent bar */}
                <div className="h-1 w-full" style={{ background: proj.color }} />

                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
                        style={{ background: proj.color }}
                      >
                        {proj.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
                          {proj.name}
                        </h3>
                        <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md ${TYPE_MAP[proj.type].bg}`}>
                          {TYPE_MAP[proj.type].icon}
                          {TYPE_MAP[proj.type].label}
                        </span>
                      </div>
                    </div>

                    {/* Star + menu */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => toggleStar(proj.id, e)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {proj.starred ? (
                          <StarFilled style={{ color: '#f59e0b', fontSize: '14px' }} />
                        ) : (
                          <StarOutlined style={{ color: '#d1d5db', fontSize: '14px' }} className="group-hover:text-gray-400" />
                        )}
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === proj.id ? null : proj.id);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
                        >
                          <EllipsisOutlined style={{ fontSize: '14px' }} />
                        </button>
                        {menuOpenId === proj.id && (
                          <div className="absolute right-0 top-8 w-32 py-1 bg-white rounded-xl shadow-lg border border-gray-100 z-30">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              <EditOutlined /> 重命名
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProject(proj.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <DeleteOutlined /> 删除项目
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">
                    {proj.description}
                  </p>

                  {/* Modules */}
                  <div className="flex items-center gap-1.5 mb-4">
                    {proj.modules.map((mod) => (
                      <span
                        key={mod}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 text-[11px]"
                      >
                        {MODULE_ICON[mod]}
                        {mod === 'writing' ? '写作' : mod === 'code' ? '代码' : mod === 'reading' ? '阅读' : mod === 'drawing' ? '绘图' : '知识库'}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-1">
                      <ClockCircleOutlined style={{ fontSize: '10px' }} />
                      <span>{proj.updatedAt}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FileTextOutlined style={{ fontSize: '10px' }} />
                        {proj.fileCount} 文件
                      </span>
                      {proj.memberCount > 1 && (
                        <span className="flex items-center gap-1">
                          <TeamOutlined style={{ fontSize: '10px' }} />
                          {proj.memberCount} 人
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="space-y-2">
            {filtered.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handleProjectClick(proj)}
                className="group flex items-center gap-4 px-5 py-4 rounded-xl border border-gray-100 bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer"
              >
                {/* Color dot */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
                  style={{ background: proj.color }}
                >
                  {proj.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
                      {proj.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${TYPE_MAP[proj.type].bg}`}>
                      {TYPE_MAP[proj.type].label}
                    </span>
                    {proj.starred && <StarFilled style={{ color: '#f59e0b', fontSize: '12px' }} />}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{proj.description}</p>
                </div>

                {/* Modules */}
                <div className="hidden md:flex items-center gap-1.5 shrink-0">
                  {proj.modules.map((mod) => (
                    <span key={mod} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 text-[11px]">
                      {MODULE_ICON[mod]}
                    </span>
                  ))}
                </div>

                {/* Meta */}
                <div className="hidden sm:flex flex-col items-end gap-0.5 text-[11px] text-gray-400 shrink-0">
                  <span>{proj.updatedAt}</span>
                  <span>{proj.fileCount} 文件</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => toggleStar(proj.id, e)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {proj.starred ? (
                      <StarFilled style={{ color: '#f59e0b', fontSize: '13px' }} />
                    ) : (
                      <StarOutlined style={{ color: '#d1d5db', fontSize: '13px' }} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}
