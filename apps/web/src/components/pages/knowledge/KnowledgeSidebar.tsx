'use client';
import { useState } from 'react';
import { 
  FolderOutlined, 
  FileTextOutlined, 
  UploadOutlined, 
  SearchOutlined, 
  TagsOutlined,
  IdcardOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  PlusOutlined,
  DownOutlined,
  RightOutlined,
  CloudUploadOutlined,
  ApartmentOutlined,
  BookOutlined
} from '@ant-design/icons';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: MenuItem[];
}

interface KnowledgeSidebarProps {
  activeItem: string;
  onItemSelect: (id: string) => void;
}

const menuData: MenuItem[] = [
  {
    id: 'literature',
    label: '文献管理',
    icon: <BookOutlined />,
    children: [
      { id: 'all-docs', label: '全部文献', icon: <FolderOutlined /> },
      { id: 'pdf-upload', label: 'PDF上传', icon: <UploadOutlined /> },
      { id: 'keyword-search', label: '关键词检索', icon: <SearchOutlined /> },
    ]
  },
  {
    id: 'knowledge-process',
    label: '知识处理',
    icon: <DatabaseOutlined />,
    children: [
      { id: 'pdf-parse', label: 'PDF解析', icon: <FileSearchOutlined /> },
      { id: 'knowledge-graph', label: '知识图谱', icon: <ApartmentOutlined /> },
      { id: 'vector-db', label: '向量数据库', icon: <DatabaseOutlined /> },
    ]
  },
  {
    id: 'knowledge-organize',
    label: '知识整理',
    icon: <TagsOutlined />,
    children: [
      { id: 'tag-manage', label: '标签管理', icon: <TagsOutlined /> },
      { id: 'knowledge-card', label: '知识卡片', icon: <IdcardOutlined /> },
      { id: 'reading-notes', label: '阅读笔记', icon: <FileTextOutlined /> },
    ]
  },
];

export default function KnowledgeSidebar({ activeItem, onItemSelect }: KnowledgeSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['literature', 'knowledge-process', 'knowledge-organize']);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <div className="w-75 h-full bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* 顶部标题和新建按钮 */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-base font-semibold text-gray-800">知识库</span>
          <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
            <PlusOutlined className="text-sm" />
          </button>
        </div>
        {/* 搜索框 */}
        <div className="relative">
          <input 
            type="text"
            placeholder="搜索文献..."
            className="w-full h-9 pl-4 pr-9 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
          />
          <SearchOutlined className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* 菜单列表 */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        {menuData.map((group) => (
          <div key={group.id} className="mb-2">
            {/* 分组标题 */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full px-3 py-2.5 flex items-center gap-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {expandedGroups.includes(group.id) ? (
                <DownOutlined className="text-[10px]" />
              ) : (
                <RightOutlined className="text-[10px]" />
              )}
              <span className="font-medium">{group.label}</span>
            </button>

            {/* 子菜单 */}
            {expandedGroups.includes(group.id) && group.children && (
              <div className="mt-1 ml-3 space-y-1">
                {group.children.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onItemSelect(item.id)}
                    className={`w-full px-3 py-2.5 flex items-center gap-3 text-sm rounded-lg transition-colors ${
                      activeItem === item.id
                        ? 'text-primary bg-primary/10 font-medium'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
