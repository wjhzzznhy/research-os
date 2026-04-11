'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  BulbOutlined,
  SendOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  ExperimentOutlined,
  PlusOutlined,
  CloseOutlined,
  TagOutlined,
  NodeIndexOutlined,
  RobotOutlined,
  UserOutlined,
  ThunderboltOutlined,
  SyncOutlined,
  ExpandOutlined,
  CompressOutlined,
} from '@ant-design/icons';

/* ═══════════════════════════════════════════════════════
   类型定义
   ═══════════════════════════════════════════════════════ */

interface InnovationNode {
  id: string;
  title: string;
  description: string;
  detail: string;
  status: 'idea' | 'developing' | 'validated';
  tags: string[];
  children: InnovationNode[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  time: string;
}

/* ═══════════════════════════════════════════════════════
   状态配置
   ═══════════════════════════════════════════════════════ */

const STATUS_CONFIG: Record<InnovationNode['status'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  idea: { label: '灵感', color: '#8b5cf6', bg: 'bg-violet-50 text-violet-600 border-violet-200', icon: <BulbOutlined /> },
  developing: { label: '推演中', color: '#3b82f6', bg: 'bg-blue-50 text-blue-600 border-blue-200', icon: <ExperimentOutlined /> },
  validated: { label: '已验证', color: '#1a5c3a', bg: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircleFilled /> },
};

/* ═══════════════════════════════════════════════════════
   Mock 数据
   ═══════════════════════════════════════════════════════ */

const MOCK_TREE: InnovationNode = {
  id: 'root',
  title: 'AI 智能助教系统',
  description: '基于大语言模型的新一代智能助教，覆盖个性化学习、智能批改和交互式问答。',
  detail: '本项目旨在构建一个面向高校场景的智能助教系统，利用大语言模型的理解与生成能力，为学生提供个性化的学习支持。系统涵盖学习路径规划、作业智能批改、交互式知识问答三大核心模块，目标是显著提升教学效率和学生学习体验。',
  status: 'developing',
  tags: ['LLM', '智能教育', '人机协作'],
  children: [
    {
      id: 'n1',
      title: '个性化学习路径生成',
      description: '根据学生知识掌握情况，动态生成最优学习路径。',
      detail: '通过构建学生知识画像，结合课程知识图谱，利用强化学习算法动态规划个性化学习路径。系统能根据学生的学习进度、薄弱环节和学习偏好，实时调整推荐内容的难度和顺序。与传统固定课程大纲相比，个性化路径可提升学习效率约 30%。',
      status: 'developing',
      tags: ['知识图谱', '强化学习', '自适应'],
      children: [
        {
          id: 'n1-1',
          title: '知识图谱驱动的路径规划',
          description: '利用课程知识图谱建模知识点依赖关系，确保学习顺序的合理性。',
          detail: '将课程内容结构化为知识图谱，节点表示知识点，边表示前置依赖关系。通过图遍历算法（拓扑排序 + 最短路径）生成满足依赖约束的学习路径。结合 LLM 对知识点的语义理解，自动识别隐含的跨章节关联。',
          status: 'validated',
          tags: ['知识图谱', '图算法'],
          children: [],
        },
        {
          id: 'n1-2',
          title: '自适应难度调节机制',
          description: '基于学生实时反馈，动态调节内容难度等级。',
          detail: '引入多臂赌博机（MAB）算法实现难度自适应。根据学生做题正确率、用时和主观反馈，实时计算最优难度区间。采用 ε-greedy 策略在探索新难度和利用已知最优难度间平衡，确保学生始终处于"最近发展区"。',
          status: 'idea',
          tags: ['MAB', '自适应学习'],
          children: [],
        },
      ],
    },
    {
      id: 'n2',
      title: '智能作业批改与反馈',
      description: 'AI 自动批改作业并生成个性化反馈建议。',
      detail: '利用 LLM 的代码理解和自然语言处理能力，自动批改编程作业和论述题。系统不仅给出分数，还能精确定位错误原因、提供修改建议，并关联到对应知识点。对比人工批改，准确率达 92%，效率提升 15 倍。',
      status: 'developing',
      tags: ['LLM', '自动评分', 'NLP'],
      children: [
        {
          id: 'n2-1',
          title: '多维度评分模型',
          description: '从正确性、代码质量、创新性等多个维度进行评估。',
          detail: '设计多维度评分 rubric，结合 LLM 对代码/文本的深度分析，从正确性（功能是否实现）、质量（代码风格、可读性）、效率（时间/空间复杂度）、创新性（解题思路的独特性）四个维度独立评分。每个维度使用专门的提示工程模板，最终加权汇总。',
          status: 'idea',
          tags: ['评分系统', '提示工程'],
          children: [],
        },
      ],
    },
    {
      id: 'n3',
      title: '交互式知识问答',
      description: '基于课程内容的智能问答，支持追问和引导式教学。',
      detail: '构建基于 RAG（检索增强生成）的课程问答系统，以教材和课件为知识源。不同于简单的问答，系统采用苏格拉底式引导教学法，通过反问和提示逐步引导学生自主思考，而非直接给出答案。',
      status: 'developing',
      tags: ['RAG', '对话系统', '教育'],
      children: [
        {
          id: 'n3-1',
          title: '上下文感知追问策略',
          description: '根据对话历史判断学生理解程度，智能决定追问内容。',
          detail: '基于对话状态追踪（DST），维护学生在当前会话中的知识理解状态。当检测到学生存在概念混淆或理解偏差时，自动生成针对性追问，帮助学生发现自身思维漏洞。',
          status: 'developing',
          tags: ['DST', '对话管理'],
          children: [],
        },
        {
          id: 'n3-2',
          title: '苏格拉底式引导教学',
          description: '通过层层递进的提问引导学生自主推导答案。',
          detail: '受苏格拉底教学法启发，设计分层提示策略：Level 1 - 开放式启发提问；Level 2 - 缩小范围的引导提问；Level 3 - 关键概念的直接提示。根据学生回答质量动态选择提示层级，鼓励学生自主思考。实验表明该策略比直接回答提升知识保留率 45%。',
          status: 'validated',
          tags: ['教学法', '提示策略'],
          children: [],
        },
      ],
    },
  ],
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    role: 'ai',
    content: '你好！我是 AI 创新助手 🚀\n\n我可以帮你：\n• 头脑风暴，发现新的创新方向\n• 对已有创新点进行深度迭代\n• 分析创新点的可行性和价值\n\n请告诉我你的研究方向，或者点击左侧树中的节点与我讨论。',
    time: '16:30',
  },
  {
    id: 'msg-2',
    role: 'user',
    content: '我在研究 AI 智能助教系统，帮我分析一下有哪些可以深入的创新方向？',
    time: '16:31',
  },
  {
    id: 'msg-3',
    role: 'ai',
    content: '基于对 AI 智能教育领域的分析，我为你识别了 **3 个核心创新方向**：\n\n🎯 **个性化学习路径生成** — 利用知识图谱和强化学习，动态规划最优学习路线\n\n📝 **智能作业批改与反馈** — LLM 驱动的多维度评分，效率比人工提升 15 倍\n\n💬 **交互式知识问答** — 苏格拉底式引导教学，知识保留率提升 45%\n\n已生成创新点树状图 ✅ 点击节点可查看详情，选择任一方向我们可以继续深入迭代。',
    time: '16:31',
  },
];

/* ═══════════════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════════════ */

export default function InnovationPage() {
  const [tree, setTree] = useState<InnovationNode>(MOCK_TREE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [treeExpanded, setTreeExpanded] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'title' | 'description' | 'detail' | null>(null);
  const [editingText, setEditingText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const findNode = useCallback((node: InnovationNode, id: string): InnovationNode | null => {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }, []);

  const selectedNode = useMemo(() => (selectedId ? findNode(tree, selectedId) : null), [tree, selectedId, findNode]);

  const updateNode = useCallback((nodeId: string, field: 'title' | 'description' | 'detail', value: string) => {
    const update = (node: InnovationNode): InnovationNode => {
      if (node.id === nodeId) return { ...node, [field]: value };
      return { ...node, children: node.children.map(update) };
    };
    setTree(prev => update(prev));
  }, []);

  const startEdit = useCallback((nodeId: string, field: 'title' | 'description' | 'detail', text: string) => {
    setEditingNode(nodeId);
    setEditingField(field);
    setEditingText(text);
  }, []);

  const commitEdit = useCallback(() => {
    if (editingNode && editingField) {
      updateNode(editingNode, editingField, editingText);
    }
    setEditingNode(null);
    setEditingField(null);
  }, [editingNode, editingField, editingText, updateNode]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'ai',
        content: generateAIResponse(input.trim(), selectedNode),
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  }, [input, selectedNode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* ═══ 左侧：创新点树 + 详情卡片 ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 顶栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <BulbOutlined style={{ fontSize: '13px', color: '#fff' }} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-800 leading-tight">创新点树</h1>
              <p className="text-[10px] text-gray-400">点击节点查看详情 · 与 AI 对话迭代</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditMode(!editMode); setEditingNode(null); }}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg transition-colors ${
                editMode
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-500 hover:text-primary hover:bg-primary/5'
              }`}
            >
              {editMode ? '退出编辑' : '编辑模式'}
            </button>
            <button
              onClick={() => setTreeExpanded(!treeExpanded)}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
            >
              {treeExpanded ? <CompressOutlined style={{ fontSize: '11px' }} /> : <ExpandOutlined style={{ fontSize: '11px' }} />}
              {treeExpanded ? '收起树' : '展开树'}
            </button>
          </div>
        </div>

        {/* 树 + 详情区 */}
        <div className="flex-1 overflow-auto" style={{ background: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          {treeExpanded && (
            <div className="p-6 overflow-x-auto">
              <TreeBranch 
                node={tree} 
                selectedId={selectedId} 
                onSelect={setSelectedId} 
                editMode={editMode}
                editingNode={editingNode}
                editingField={editingField}
                editingText={editingText}
                onStartEdit={startEdit}
                onChangeText={setEditingText}
                onCommitEdit={commitEdit}
                isRoot 
              />
            </div>
          )}

          {/* 详情卡片 */}
          {selectedNode && (
            <div className="mx-5 mb-5">
              <DetailCard 
                node={selectedNode} 
                onClose={() => setSelectedId(null)}
                editMode={editMode}
                editingNode={editingNode}
                editingField={editingField}
                editingText={editingText}
                onStartEdit={startEdit}
                onChangeText={setEditingText}
                onCommitEdit={commitEdit}
              />
            </div>
          )}

          {!treeExpanded && !selectedNode && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
              <BulbOutlined style={{ fontSize: '36px' }} className="text-gray-300 mb-3" />
              <p className="text-sm">展开树状图查看创新点</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 右侧：AI 对话面板 ═══ */}
      <div className="w-[340px] shrink-0 border-l border-gray-100 flex flex-col bg-white">
        {/* 对话头部 */}
        <div className="px-4 py-3 border-b border-gray-100 shrink-0" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
              <RobotOutlined style={{ fontSize: '12px', color: '#fff' }} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-gray-800">AI 创新助手</h2>
              <p className="text-[10px] text-gray-400">对话生成 · 迭代创新</p>
            </div>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                  msg.role === 'ai'
                    ? 'bg-gradient-to-br from-primary to-emerald-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {msg.role === 'ai' ? <RobotOutlined /> : <UserOutlined />}
              </div>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : ''}`}>
                <div
                  className={`px-3 py-2.5 rounded-2xl text-[12px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'ai'
                      ? 'bg-gray-50 text-gray-700 rounded-tl-sm'
                      : 'bg-primary text-white rounded-tr-sm'
                  }`}
                >
                  {formatMessage(msg.content)}
                </div>
                <p className={`text-[9px] text-gray-300 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>{msg.time}</p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shrink-0">
                <RobotOutlined style={{ fontSize: '10px', color: '#fff' }} />
              </div>
              <div className="px-3 py-2.5 bg-gray-50 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* 快捷操作 */}
        <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-gray-50">
          {[
            { label: '生成创新点', icon: <ThunderboltOutlined />, msg: '帮我基于当前研究方向生成一个新的创新点' },
            { label: '深入迭代', icon: <SyncOutlined />, msg: selectedNode ? `请对「${selectedNode.title}」进行深入迭代和优化` : '请对选中的创新点进行深入迭代' },
            { label: '可行性分析', icon: <ExperimentOutlined />, msg: selectedNode ? `请分析「${selectedNode.title}」的可行性和潜在挑战` : '请分析选中创新点的可行性' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => {
                setInput(action.msg);
                setTimeout(() => {
                  setInput('');
                  const userMsg: ChatMessage = {
                    id: `msg-${Date.now()}`,
                    role: 'user',
                    content: action.msg,
                    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
                  };
                  setMessages((prev) => [...prev, userMsg]);
                  setIsTyping(true);
                  setTimeout(() => {
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `msg-${Date.now() + 1}`,
                        role: 'ai',
                        content: generateAIResponse(action.msg, selectedNode),
                        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
                      },
                    ]);
                    setIsTyping(false);
                  }, 1200);
                }, 50);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-gray-500 bg-gray-50 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors border border-gray-100"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>

        {/* 输入框 */}
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-end gap-2 p-2 rounded-xl border border-gray-200 bg-gray-50/50 focus-within:border-primary/40 focus-within:bg-white transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述你的想法，AI 帮你发现创新点..."
              rows={2}
              className="flex-1 bg-transparent text-xs text-gray-700 outline-none resize-none placeholder-gray-400 leading-relaxed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 transition-all disabled:opacity-30"
              style={{ background: input.trim() ? 'linear-gradient(135deg, #1a5c3a, #166534)' : '#d1d5db' }}
            >
              <SendOutlined style={{ fontSize: '11px' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   树状图递归渲染
   ═══════════════════════════════════════════════════════ */

function TreeBranch({
  node,
  selectedId,
  onSelect,
  editMode,
  editingNode,
  editingField,
  editingText,
  onStartEdit,
  onChangeText,
  onCommitEdit,
  isRoot = false,
}: {
  node: InnovationNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  editMode: boolean;
  editingNode: string | null;
  editingField: 'title' | 'description' | 'detail' | null;
  editingText: string;
  onStartEdit: (nodeId: string, field: 'title' | 'description' | 'detail', text: string) => void;
  onChangeText: (text: string) => void;
  onCommitEdit: () => void;
  isRoot?: boolean;
}) {
  const status = STATUS_CONFIG[node.status];
  const isSelected = selectedId === node.id;

  return (
    <div className="flex items-start">
      {/* 节点卡片 */}
      <button
        onClick={() => onSelect(node.id)}
        className={`shrink-0 text-left rounded-xl border-2 transition-all duration-200 hover:shadow-lg group ${
          isRoot ? 'px-4 py-3 min-w-[180px]' : 'px-3 py-2.5 min-w-[160px]'
        } ${
          isSelected
            ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
        style={{ borderLeftColor: status.color, borderLeftWidth: '3px' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md border ${status.bg}`}>
            {status.icon}
            {status.label}
          </span>
        </div>
        <h3 className={`font-bold leading-snug mb-0.5 group-hover:text-primary transition-colors ${isRoot ? 'text-sm' : 'text-xs'} ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
          {node.title}
        </h3>
        <p className="text-[10px] text-gray-400 leading-snug line-clamp-2">{node.description}</p>
        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {node.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* 子节点 */}
      {node.children.length > 0 && (
        <div className="flex items-center ml-0">
          {/* 父到子的水平连线 */}
          <div className="w-8 shrink-0 flex items-center self-stretch">
            <svg width="32" height="100%" className="overflow-visible">
              <line x1="0" y1="50%" x2="32" y2="50%" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>
          </div>

          {/* 子节点列 + 垂直连线 */}
          <div className="flex flex-col">
            {node.children.map((child, i) => (
              <div key={child.id} className="flex items-stretch">
                {/* 连线：上半段 + 水平 + 下半段 */}
                <div className="flex flex-col items-center w-5 shrink-0">
                  <div className={`w-px flex-1 ${i === 0 ? '' : 'bg-gray-300'}`} style={i === 0 ? {} : { minHeight: '8px' }} />
                  <div className="w-full h-px bg-gray-300 shrink-0" />
                  <div className={`w-px flex-1 ${i === node.children.length - 1 ? '' : 'bg-gray-300'}`} style={i === node.children.length - 1 ? {} : { minHeight: '8px' }} />
                </div>

                {/* 递归子树 */}
                <div className="py-2">
                  <TreeBranch 
                    node={child} 
                    selectedId={selectedId} 
                    onSelect={onSelect}
                    editMode={editMode}
                    editingNode={editingNode}
                    editingField={editingField}
                    editingText={editingText}
                    onStartEdit={onStartEdit}
                    onChangeText={onChangeText}
                    onCommitEdit={onCommitEdit}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   详情卡片
   ═══════════════════════════════════════════════════════ */

function DetailCard({ 
  node, 
  onClose,
  editMode,
  editingNode,
  editingField,
  editingText,
  onStartEdit,
  onChangeText,
  onCommitEdit,
}: { 
  node: InnovationNode; 
  onClose: () => void;
  editMode: boolean;
  editingNode: string | null;
  editingField: 'title' | 'description' | 'detail' | null;
  editingText: string;
  onStartEdit: (nodeId: string, field: 'title' | 'description' | 'detail', text: string) => void;
  onChangeText: (text: string) => void;
  onCommitEdit: () => void;
}) {
  const status = STATUS_CONFIG[node.status];
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
      {/* 顶部色带 */}
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${status.color}, ${status.color}88)` }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border font-medium ${status.bg}`}>
                {status.icon}
                {status.label}
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <NodeIndexOutlined style={{ fontSize: '10px' }} />
                {node.id}
              </span>
            </div>
            {editMode && editingNode === node.id && editingField === 'title' ? (
              <input
                autoFocus
                value={editingText}
                onChange={(e) => onChangeText(e.target.value)}
                onBlur={onCommitEdit}
                onKeyDown={(e) => { if (e.key === 'Enter') onCommitEdit(); }}
                className="text-base font-bold text-gray-900 bg-white border border-primary/30 rounded px-2 py-1 outline-none focus:border-primary w-full"
              />
            ) : (
              <h3 
                className={`text-base font-bold text-gray-900 ${editMode ? 'cursor-text hover:bg-amber-50 px-2 py-1 rounded transition-colors' : ''}`}
                onDoubleClick={() => editMode && onStartEdit(node.id, 'title', node.title)}
              >
                {node.title}
              </h3>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0 ml-3"
          >
            <CloseOutlined style={{ fontSize: '11px' }} />
          </button>
        </div>

        {editMode && editingNode === node.id && editingField === 'detail' ? (
          <textarea
            autoFocus
            value={editingText}
            onChange={(e) => onChangeText(e.target.value)}
            onBlur={onCommitEdit}
            rows={4}
            className="w-full text-xs text-gray-600 leading-relaxed mb-4 bg-white border border-primary/30 rounded px-2 py-1 outline-none focus:border-primary resize-none"
          />
        ) : (
          <p 
            className={`text-xs text-gray-600 leading-relaxed mb-4 ${editMode ? 'cursor-text hover:bg-amber-50 px-2 py-1 rounded transition-colors' : ''}`}
            onDoubleClick={() => editMode && onStartEdit(node.id, 'detail', node.detail)}
          >
            {node.detail}
          </p>
        )}

        {/* 标签 */}
        <div className="flex items-center gap-1.5 mb-4">
          <TagOutlined style={{ fontSize: '10px' }} className="text-gray-400" />
          {node.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-600 rounded-md border border-gray-100">
              {tag}
            </span>
          ))}
        </div>

        {/* 子节点预览 */}
        {node.children.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 mb-2 font-medium">迭代方向 ({node.children.length})</p>
            <div className="flex flex-wrap gap-2">
              {node.children.map((child) => {
                const cs = STATUS_CONFIG[child.status];
                return (
                  <div key={child.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cs.color }} />
                    <span className="text-[11px] text-gray-700 font-medium">{child.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   辅助函数
   ═══════════════════════════════════════════════════════ */

function formatMessage(content: string) {
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <span key={i} className="font-bold">
          {part.slice(2, -2)}
        </span>
      );
    }
    return part;
  });
}

function generateAIResponse(userInput: string, selectedNode: InnovationNode | null): string {
  if (userInput.includes('生成') && userInput.includes('创新点')) {
    return '基于你的研究方向，我建议一个新的创新点：\n\n🆕 **自动化课程内容生成**\n\n利用大语言模型从学术论文和教材中自动提取核心知识点，生成教学讲义、练习题和考试试卷。结合 RAG 技术确保内容准确性。\n\n• 状态：灵感阶段\n• 关键技术：RAG、知识提取、文本生成\n• 预期价值：教师备课效率提升 5 倍\n\n需要我将其加入创新点树中吗？';
  }

  if (userInput.includes('迭代') || userInput.includes('优化')) {
    const name = selectedNode?.title || '当前创新点';
    return `对「${name}」的迭代建议：\n\n1️⃣ **增加对比实验维度**\n在原有基础上加入与传统方法的 A/B 测试对比\n\n2️⃣ **引入用户画像分层**\n区分不同学习风格（视觉型/听觉型/实践型）的学生群体\n\n3️⃣ **长期效果追踪**\n设计纵向实验，追踪一个学期内的学习效果变化曲线\n\n这些迭代方向可以进一步增强创新点的深度和可信度。需要展开哪个方向？`;
  }

  if (userInput.includes('可行性') || userInput.includes('分析')) {
    const name = selectedNode?.title || '该创新点';
    return `「${name}」可行性分析：\n\n✅ **优势**\n• 技术栈成熟，LLM + RAG 方案已有大量成功案例\n• 教育场景需求明确，痛点真实\n• 可增量开发，快速验证\n\n⚠️ **挑战**\n• 专业领域知识的准确性需人工校验\n• 学生隐私数据的合规处理\n• 不同课程的泛化能力验证\n\n📊 **建议优先级**: 高\n预计 MVP 开发周期: 6-8 周\n\n整体评估：**值得投入**，建议从单一课程试点开始。`;
  }

  if (selectedNode) {
    return `关于「${selectedNode.title}」，这是一个很好的研究方向。\n\n${selectedNode.detail}\n\n你可以进一步考虑：\n• 这个方向的差异化竞争优势是什么？\n• 有没有可量化的评估指标？\n• 是否有可参考的开源实现？\n\n需要我帮你深入分析某个方面吗？`;
  }

  return '这是一个很有意思的想法！💡\n\n让我从几个角度来分析：\n• 技术可行性方面，当前 LLM 的能力已经能很好地支撑这类应用\n• 创新性方面，建议关注与现有方案的差异化\n• 实用性方面，建议先确定具体的应用场景和目标用户\n\n你想从哪个方向继续深入探讨？';
}
