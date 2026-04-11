'use client';
import { useState } from 'react';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  PlusOutlined,
  EllipsisOutlined,
  SearchOutlined,
} from '@ant-design/icons';

interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  fileExt?: string;
  children?: FileNode[];
}

const mockFileTree: FileNode[] = [
  {
    id: 'root',
    name: 'ml-experiment',
    type: 'folder',
    children: [
      {
        id: 'src',
        name: 'src',
        type: 'folder',
        children: [
          { id: 'main', name: 'main.py', type: 'file', fileExt: 'py' },
          { id: 'model', name: 'model.py', type: 'file', fileExt: 'py' },
          { id: 'train', name: 'train.py', type: 'file', fileExt: 'py' },
          { id: 'evaluate', name: 'evaluate.py', type: 'file', fileExt: 'py' },
          { id: 'dataset', name: 'dataset.py', type: 'file', fileExt: 'py' },
        ],
      },
      {
        id: 'utils',
        name: 'utils',
        type: 'folder',
        children: [
          { id: 'init', name: '__init__.py', type: 'file', fileExt: 'py' },
          { id: 'logger', name: 'logger.py', type: 'file', fileExt: 'py' },
          { id: 'config', name: 'config.py', type: 'file', fileExt: 'py' },
          { id: 'vis', name: 'visualize.py', type: 'file', fileExt: 'py' },
        ],
      },
      {
        id: 'data',
        name: 'data',
        type: 'folder',
        children: [
          { id: 'readme-data', name: 'README.md', type: 'file', fileExt: 'md' },
        ],
      },
      {
        id: 'notebooks',
        name: 'notebooks',
        type: 'folder',
        children: [
          { id: 'eda', name: 'exploration.ipynb', type: 'file', fileExt: 'ipynb' },
          { id: 'results', name: 'results.ipynb', type: 'file', fileExt: 'ipynb' },
        ],
      },
      { id: 'req', name: 'requirements.txt', type: 'file', fileExt: 'txt' },
      { id: 'readme', name: 'README.md', type: 'file', fileExt: 'md' },
      { id: 'gitignore', name: '.gitignore', type: 'file', fileExt: 'gitignore' },
      { id: 'setup', name: 'setup.py', type: 'file', fileExt: 'py' },
    ],
  },
];

function getFileIcon(fileExt?: string) {
  const iconStyle = { fontSize: '12px', flexShrink: 0 as const };
  switch (fileExt) {
    case 'py':
      return <span style={{ ...iconStyle, color: '#3572A5' }}>🐍</span>;
    case 'ipynb':
      return <span style={{ ...iconStyle, color: '#F37626' }}>📓</span>;
    case 'md':
      return <FileOutlined style={{ ...iconStyle, color: '#083fa1' }} />;
    case 'txt':
      return <FileOutlined style={{ ...iconStyle, color: '#6b7280' }} />;
    case 'json':
      return <FileOutlined style={{ ...iconStyle, color: '#f7df1e' }} />;
    default:
      return <FileOutlined style={{ ...iconStyle, color: '#9ca3af' }} />;
  }
}

function FileTreeNode({
  node,
  depth = 0,
  activeId,
  onSelect,
}: {
  node: FileNode;
  depth?: number;
  activeId: string;
  onSelect: (id: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1.5 py-[3px] pr-2 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
          style={{ paddingLeft: `${6 + depth * 14}px` }}
        >
          {expanded ? (
            <FolderOpenOutlined style={{ color: '#f59e0b', fontSize: '12px', flexShrink: 0 }} />
          ) : (
            <FolderOutlined style={{ color: '#f59e0b', fontSize: '12px', flexShrink: 0 }} />
          )}
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                activeId={activeId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.id, node.name)}
      className={`w-full flex items-center gap-1.5 py-[3px] pr-2 text-xs rounded transition-colors ${
        activeId === node.id
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
      style={{ paddingLeft: `${6 + depth * 14}px` }}
    >
      <span style={{ flexShrink: 0, fontSize: '12px' }}>{getFileIcon(node.fileExt)}</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

interface CodeFileExplorerProps {
  onFileSelect: (id: string, name: string) => void;
}

export default function CodeFileExplorer({ onFileSelect }: CodeFileExplorerProps) {
  const [activeId, setActiveId] = useState('main');
  const [search, setSearch] = useState('');

  const handleSelect = (id: string, name: string) => {
    setActiveId(id);
    onFileSelect(id, name);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 shrink-0">
        <span className="text-xs font-semibold text-gray-700 tracking-wide">文件</span>
        <div className="flex items-center gap-0.5">
          <button className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
            <PlusOutlined style={{ fontSize: '10px' }} />
          </button>
          <button className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
            <EllipsisOutlined style={{ fontSize: '10px' }} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-gray-200 bg-gray-50">
          <SearchOutlined style={{ fontSize: '10px', color: '#9ca3af' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索文件..."
            className="flex-1 bg-transparent text-xs text-gray-600 outline-none placeholder-gray-400"
          />
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {mockFileTree.map((node) => (
          <FileTreeNode
            key={node.id}
            node={node}
            activeId={activeId}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
