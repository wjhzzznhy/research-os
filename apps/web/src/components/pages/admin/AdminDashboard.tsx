'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLayout } from '@/context/LayoutContext';
import { apiClient } from '@/lib/api/client';
import {
  RobotOutlined,
  ToolOutlined,
  ApartmentOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  ApiOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  CodeOutlined,
  BulbOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  ExclamationCircleFilled,
  LeftOutlined,
  SaveOutlined,
  EyeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  BranchesOutlined,
  ReadOutlined,
} from '@ant-design/icons';

/* ═══════════════════════════════════════════════════════
   类型定义
   ═══════════════════════════════════════════════════════ */

interface AgentSkill {
  id: string;
  name: string;
  description: string;
  type: 'tool' | 'api' | 'knowledge' | 'code';
  enabled: boolean;
}

interface WorkflowNodeConfig {
  system_prompt?: string;
  prompt?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: string[];
  query_hint?: string;
  output_format?: string;
  condition_note?: string;
  reply_template?: string;
  inputs?: Record<string, string>;
  [key: string]: unknown;
}

interface WorkflowNode {
  id: string;
  type: 'start' | 'llm' | 'tool' | 'condition' | 'reply' | 'knowledge';
  label: string;
  x: number;
  y: number;
  config?: WorkflowNodeConfig;
}

interface WorkflowEdge {
  from: string;
  to: string;
  label?: string;
}

interface AgentData {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  role: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  status: 'active' | 'draft' | 'disabled';
  skills: AgentSkill[];
  workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
  lastModified: string;
  calls: number;
}

type AdminView = 'dashboard' | 'editor' | 'orchestration';
type EditorTab = 'role' | 'prompt' | 'skills' | 'settings';
type ApiEnvelope<T> = { code: number; message: string; data: T; trace_id?: string };
type SystemConfigData = {
  llm_api_key_masked: string;
  llm_base_url: string;
  llm_model_default: string;
};
type AgentRunData = {
  session_id: number;
  status: string;
  final_output: string;
  execution_history: Array<{ role?: string; content?: string }>;
};

const MODEL_SUGGESTIONS = [
  'Qwen/Qwen2.5-7B-Instruct',
  'Qwen/Qwen3-8B',
  'deepseek-ai/DeepSeek-V3',
  'gpt-4o',
  'gpt-4o-mini',
  'qwen-plus',
  'qwen-max',
];

async function listAgentTemplates() {
  const response = await apiClient.get<ApiEnvelope<AgentData[]>>('/agents/templates');
  return response.data.data;
}

async function createAgentTemplate(agent: AgentData) {
  const response = await apiClient.post<ApiEnvelope<AgentData>>('/agents/templates', agent);
  return response.data.data;
}

async function updateAgentTemplate(agent: AgentData) {
  const response = await apiClient.put<ApiEnvelope<AgentData>>(`/agents/templates/${agent.id}`, agent);
  return response.data.data;
}

async function deleteAgentTemplate(agentId: string) {
  await apiClient.delete<ApiEnvelope<{ message: string }>>(`/agents/templates/${agentId}`);
}

async function getSystemConfig() {
  const response = await apiClient.get<ApiEnvelope<SystemConfigData>>('/system/config');
  return response.data.data;
}

async function updateSystemConfig(data: { llm_api_key?: string; llm_base_url?: string; llm_model_default?: string }) {
  const response = await apiClient.put<ApiEnvelope<{ message: string }>>('/system/config', data);
  return response.data.data;
}

async function runAgentWorkflow(workflowId: string, userInput: string) {
  const response = await apiClient.post<ApiEnvelope<AgentRunData>>('/agents/run', {
    project_id: 1,
    workflow_id: workflowId,
    session_name: '管理台运行测试',
    user_input: userInput,
    payload: {},
  }, { timeout: 60000 });
  return response.data.data;
}

/* ═══════════════════════════════════════════════════════
   Mock 数据
   ═══════════════════════════════════════════════════════ */

const SKILL_TEMPLATES: AgentSkill[] = [
  { id: 'sk-web', name: '网络搜索', description: '搜索互联网获取最新信息', type: 'tool', enabled: false },
  { id: 'sk-pdf', name: 'PDF 解析', description: '解析和提取 PDF 文档内容', type: 'tool', enabled: false },
  { id: 'sk-code', name: '代码执行', description: '在沙箱中运行 Python 代码', type: 'code', enabled: false },
  { id: 'sk-kb', name: '知识库检索', description: '从向量知识库中检索相关内容', type: 'knowledge', enabled: false },
  { id: 'sk-api', name: 'HTTP 请求', description: '调用外部 REST API 接口', type: 'api', enabled: false },
  { id: 'sk-draw', name: '图表生成', description: '根据数据生成可视化图表', type: 'tool', enabled: false },
  { id: 'sk-translate', name: '多语言翻译', description: '支持多语言互译', type: 'tool', enabled: false },
  { id: 'sk-math', name: '数学计算', description: '精确的数学和统计计算', type: 'code', enabled: false },
];

const MOCK_AGENTS: AgentData[] = [
  {
    id: 'agent-literature',
    name: 'AI 文献综述助手',
    description: '智能分析文献、生成综述报告、构建研究脉络',
    icon: '📚',
    color: '#3b82f6',
    role: '你是一位资深的学术文献分析专家，擅长阅读、理解和综合大量学术论文。',
    systemPrompt: '你是一位资深的学术文献分析专家。你的任务是帮助研究人员快速理解论文核心内容、提取关键信息、发现研究趋势和构建系统化的文献综述。\n\n## 核心能力\n1. 论文快速阅读与摘要生成\n2. 多论文对比分析\n3. 研究脉络梳理与时间线构建\n4. 创新点提取和方法论分析\n\n## 输出要求\n- 使用学术规范的语言\n- 保持客观中立\n- 标注引用来源\n- 对不确定的内容明确标注',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 4096,
    status: 'active',
    skills: [
      { ...SKILL_TEMPLATES[0], enabled: true },
      { ...SKILL_TEMPLATES[1], enabled: true },
      { ...SKILL_TEMPLATES[3], enabled: true },
    ],
    workflow: {
      nodes: [
        { id: 'n1', type: 'start', label: '用户输入', x: 50, y: 150 },
        { id: 'n2', type: 'knowledge', label: '知识库检索', x: 250, y: 150 },
        { id: 'n3', type: 'llm', label: 'GPT-4o 分析', x: 450, y: 150 },
        { id: 'n4', type: 'tool', label: '格式化输出', x: 650, y: 150 },
        { id: 'n5', type: 'reply', label: '返回结果', x: 850, y: 150 },
      ],
      edges: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' },
        { from: 'n3', to: 'n4' },
        { from: 'n4', to: 'n5' },
      ],
    },
    lastModified: '2025-03-28',
    calls: 1842,
  },
  {
    id: 'agent-reading',
    name: 'AI 阅读助手',
    description: '深度阅读论文、智能问答、标注与批注',
    icon: '📖',
    color: '#8b5cf6',
    role: '你是一位专注于学术论文深度阅读的 AI 助手。',
    systemPrompt: '你是一位专注于学术论文深度阅读的 AI 助手。你能够帮助用户理解论文中的复杂概念、方法和结论。\n\n## 核心能力\n1. 论文段落级精读与解释\n2. 专业术语解释\n3. 公式与算法解读\n4. 关键图表分析\n\n## 交互方式\n- 支持选中文本后进行解释\n- 支持基于上下文的追问\n- 保持解释的准确性和易懂性',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 2048,
    status: 'active',
    skills: [
      { ...SKILL_TEMPLATES[1], enabled: true },
      { ...SKILL_TEMPLATES[3], enabled: true },
    ],
    workflow: {
      nodes: [
        { id: 'n1', type: 'start', label: '用户选中文本', x: 50, y: 150 },
        { id: 'n2', type: 'llm', label: '上下文理解', x: 250, y: 150 },
        { id: 'n3', type: 'reply', label: '返回解释', x: 450, y: 150 },
      ],
      edges: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' },
      ],
    },
    lastModified: '2025-03-27',
    calls: 3210,
  },
  {
    id: 'agent-writing',
    name: 'AI 写作助手',
    description: '学术写作辅助、论文润色、结构优化',
    icon: '✍️',
    color: '#f59e0b',
    role: '你是一位学术写作专家，精通各类学术论文的写作规范。',
    systemPrompt: '你是一位学术写作专家，精通各类学术论文的写作规范。你能帮助用户进行论文撰写、润色、结构优化和格式调整。\n\n## 核心能力\n1. 论文各章节撰写辅助\n2. 学术语言润色\n3. 逻辑结构检查\n4. 参考文献格式化\n\n## 写作原则\n- 保持学术性和严谨性\n- 避免抄袭，注重原创表达\n- 符合目标期刊的格式要求',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
    status: 'active',
    skills: [
      { ...SKILL_TEMPLATES[0], enabled: true },
      { ...SKILL_TEMPLATES[3], enabled: true },
      { ...SKILL_TEMPLATES[6], enabled: true },
    ],
    workflow: {
      nodes: [
        { id: 'n1', type: 'start', label: '写作请求', x: 50, y: 150 },
        { id: 'n2', type: 'knowledge', label: '参考检索', x: 250, y: 100 },
        { id: 'n3', type: 'llm', label: '内容生成', x: 450, y: 150 },
        { id: 'n4', type: 'condition', label: '质量检查', x: 650, y: 150 },
        { id: 'n5', type: 'reply', label: '输出结果', x: 850, y: 150 },
      ],
      edges: [
        { from: 'n1', to: 'n2' },
        { from: 'n1', to: 'n3' },
        { from: 'n2', to: 'n3' },
        { from: 'n3', to: 'n4' },
        { from: 'n4', to: 'n5', label: '通过' },
        { from: 'n4', to: 'n3', label: '重写' },
      ],
    },
    lastModified: '2025-03-26',
    calls: 2567,
  },
  {
    id: 'agent-code',
    name: 'AI 代码助手',
    description: '代码生成、调试、算法实现与优化',
    icon: '💻',
    color: '#10b981',
    role: '你是一位全栈开发专家，擅长多种编程语言和框架。',
    systemPrompt: '你是一位全栈开发专家。你能够帮助研究人员实现算法、处理数据和构建实验代码。\n\n## 核心能力\n1. Python/R/MATLAB 算法实现\n2. 深度学习模型搭建\n3. 数据处理与可视化\n4. 代码调试与性能优化\n\n## 代码规范\n- 编写清晰的注释\n- 遵循 PEP8 等编码规范\n- 提供运行示例',
    model: 'gpt-4o',
    temperature: 0.1,
    maxTokens: 4096,
    status: 'active',
    skills: [
      { ...SKILL_TEMPLATES[2], enabled: true },
      { ...SKILL_TEMPLATES[7], enabled: true },
    ],
    workflow: {
      nodes: [
        { id: 'n1', type: 'start', label: '代码需求', x: 50, y: 150 },
        { id: 'n2', type: 'llm', label: '代码生成', x: 250, y: 150 },
        { id: 'n3', type: 'tool', label: '代码执行', x: 450, y: 150 },
        { id: 'n4', type: 'condition', label: '执行结果', x: 650, y: 150 },
        { id: 'n5', type: 'reply', label: '返回代码', x: 850, y: 150 },
      ],
      edges: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' },
        { from: 'n3', to: 'n4' },
        { from: 'n4', to: 'n5', label: '成功' },
        { from: 'n4', to: 'n2', label: '修复' },
      ],
    },
    lastModified: '2025-03-25',
    calls: 4102,
  },
  {
    id: 'agent-innovation',
    name: 'AI 创新点发现',
    description: '辅助发现研究创新点、可行性分析',
    icon: '💡',
    color: '#ef4444',
    role: '你是一位创新思维专家，擅长从现有研究中发现新的研究方向和创新点。',
    systemPrompt: '你是一位创新思维专家。你能够帮助研究人员从现有研究中发现新的研究方向、提出创新点并进行可行性分析。\n\n## 核心能力\n1. 研究空白发现\n2. 跨领域方法迁移\n3. 创新点可行性评估\n4. 研究路线规划\n\n## 创新原则\n- 基于扎实的文献基础\n- 评估技术可行性\n- 考虑实际应用价值',
    model: 'gpt-4o',
    temperature: 0.8,
    maxTokens: 2048,
    status: 'draft',
    skills: [
      { ...SKILL_TEMPLATES[0], enabled: true },
      { ...SKILL_TEMPLATES[3], enabled: true },
    ],
    workflow: {
      nodes: [
        { id: 'n1', type: 'start', label: '研究方向', x: 50, y: 150 },
        { id: 'n2', type: 'knowledge', label: '文献检索', x: 250, y: 100 },
        { id: 'n3', type: 'tool', label: '趋势分析', x: 250, y: 200 },
        { id: 'n4', type: 'llm', label: '创新发散', x: 500, y: 150 },
        { id: 'n5', type: 'reply', label: '创新报告', x: 700, y: 150 },
      ],
      edges: [
        { from: 'n1', to: 'n2' },
        { from: 'n1', to: 'n3' },
        { from: 'n2', to: 'n4' },
        { from: 'n3', to: 'n4' },
        { from: 'n4', to: 'n5' },
      ],
    },
    lastModified: '2025-03-24',
    calls: 892,
  },
  {
    id: 'agent-draw',
    name: 'AI 绘图助手',
    description: '学术图表、流程图、数据可视化生成',
    icon: '🎨',
    color: '#ec4899',
    role: '你是一位数据可视化专家，擅长各类学术图表和流程图的设计。',
    systemPrompt: '你是一位数据可视化和学术绘图专家。你能帮助用户设计和生成高质量的学术图表。\n\n## 核心能力\n1. 数据可视化图表\n2. 模型架构图\n3. 实验流程图\n4. 对比分析图\n\n## 设计原则\n- 清晰易读\n- 符合学术发表标准\n- 色彩搭配专业',
    model: 'gpt-4o',
    temperature: 0.5,
    maxTokens: 2048,
    status: 'disabled',
    skills: [
      { ...SKILL_TEMPLATES[2], enabled: true },
      { ...SKILL_TEMPLATES[5], enabled: true },
    ],
    workflow: {
      nodes: [
        { id: 'n1', type: 'start', label: '绘图请求', x: 50, y: 150 },
        { id: 'n2', type: 'llm', label: '理解需求', x: 250, y: 150 },
        { id: 'n3', type: 'tool', label: '图表生成', x: 450, y: 150 },
        { id: 'n4', type: 'reply', label: '返回图表', x: 650, y: 150 },
      ],
      edges: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' },
        { from: 'n3', to: 'n4' },
      ],
    },
    lastModified: '2025-03-20',
    calls: 430,
  },
];

/* ═══════════════════════════════════════════════════════
   状态配置
   ═══════════════════════════════════════════════════════ */

const STATUS_MAP: Record<AgentData['status'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active: { label: '运行中', color: '#10b981', bg: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: <CheckCircleFilled /> },
  draft: { label: '草稿', color: '#f59e0b', bg: 'bg-amber-50 text-amber-600 border-amber-200', icon: <ClockCircleOutlined /> },
  disabled: { label: '已停用', color: '#9ca3af', bg: 'bg-gray-50 text-gray-500 border-gray-200', icon: <ExclamationCircleFilled /> },
};

const SKILL_TYPE_ICON: Record<AgentSkill['type'], React.ReactNode> = {
  tool: <ToolOutlined />,
  api: <ApiOutlined />,
  knowledge: <DatabaseOutlined />,
  code: <CodeOutlined />,
};

const NODE_STYLES: Record<WorkflowNode['type'], { color: string; bg: string; icon: React.ReactNode }> = {
  start: { color: '#6b7280', bg: '#f3f4f6', icon: <PlayCircleOutlined /> },
  llm: { color: '#8b5cf6', bg: '#f5f3ff', icon: <RobotOutlined /> },
  tool: { color: '#3b82f6', bg: '#eff6ff', icon: <ToolOutlined /> },
  condition: { color: '#f59e0b', bg: '#fffbeb', icon: <BranchesOutlined /> },
  reply: { color: '#10b981', bg: '#ecfdf5', icon: <FileTextOutlined /> },
  knowledge: { color: '#ec4899', bg: '#fdf2f8', icon: <DatabaseOutlined /> },
};

const ADMIN_NAV = [
  { id: 'agents', label: '智能体管理', icon: <RobotOutlined /> },
  { id: 'skills', label: '技能市场', icon: <ToolOutlined /> },
  { id: 'orchestration', label: '编排总览', icon: <ApartmentOutlined /> },
  { id: 'settings', label: '系统设置', icon: <SettingOutlined /> },
];

function mergeDefaultAndSavedAgents(savedAgents: AgentData[]) {
  const savedMap = new Map(savedAgents.map(agent => [agent.id, agent]));
  const merged = MOCK_AGENTS.map(agent => savedMap.get(agent.id) ?? agent);
  const customAgents = savedAgents.filter(agent => !MOCK_AGENTS.some(item => item.id === agent.id));
  return [...merged, ...customAgents];
}

/* ═══════════════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════════════ */

export default function AdminDashboard() {
  const router = useRouter();
  const { logout } = useLayout();
  const [agents, setAgents] = useState<AgentData[]>(MOCK_AGENTS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState('agents');
  const [view, setView] = useState<AdminView>('dashboard');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>('role');
  const [searchQuery, setSearchQuery] = useState('');
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [defaultModel, setDefaultModel] = useState('Qwen/Qwen2.5-7B-Instruct');
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const selectedAgent = useMemo(
    () => agents.find(a => a.id === selectedAgentId) || null,
    [agents, selectedAgentId]
  );

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;
    const q = searchQuery.toLowerCase();
    return agents.filter(a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }, [agents, searchQuery]);

  useEffect(() => {
    let alive = true;
    listAgentTemplates()
      .then(items => {
        if (!alive) return;
        setAgents(mergeDefaultAndSavedAgents(items));
        setLoadError(null);
      })
      .catch(error => {
        console.error('Failed to load agent templates', error);
        if (alive) setLoadError('后端模板暂时不可用，当前显示本地默认模板');
      })

    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    getSystemConfig()
      .then(config => {
        if (!alive) return;
        if (config.llm_model_default) setDefaultModel(config.llm_model_default);
      })
      .catch(error => {
        console.error('Failed to load default model', error);
      });
    return () => { alive = false; };
  }, []);

  const openEditor = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    setView('editor');
    setEditorTab('role');
  }, []);

  const openOrchestration = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    setView('orchestration');
  }, []);

  const backToDashboard = useCallback(() => {
    setView('dashboard');
    setSelectedAgentId(null);
  }, []);

  const updateAgent = useCallback((id: string, updates: Partial<AgentData>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const saveAgent = useCallback(async (id: string, updates: Partial<AgentData> = {}) => {
    let nextAgent: AgentData | null = null;
    setAgents(prev => prev.map(agent => {
      if (agent.id !== id) return agent;
      nextAgent = {
        ...agent,
        ...updates,
        lastModified: new Date().toISOString().split('T')[0],
      };
      return nextAgent;
    }));

    if (!nextAgent) return;

    try {
      const saved = await updateAgentTemplate(nextAgent);
      setAgents(prev => prev.map(agent => agent.id === id ? saved : agent));
    } catch (error) {
      try {
        const created = await createAgentTemplate(nextAgent);
        setAgents(prev => prev.map(agent => agent.id === id ? created : agent));
      } catch (createError) {
        console.error('Failed to save agent template', createError || error);
        throw createError;
      }
    }
  }, []);

  const duplicateAgent = useCallback(async (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;
    const newAgent: AgentData = {
      ...agent,
      id: `agent-${Date.now()}`,
      name: `${agent.name} (副本)`,
      status: 'draft',
      lastModified: new Date().toISOString().split('T')[0],
      calls: 0,
    };
    setAgents(prev => [...prev, newAgent]);
    try {
      const saved = await createAgentTemplate(newAgent);
      setAgents(prev => prev.map(a => a.id === newAgent.id ? saved : a));
    } catch (error) {
      console.error('Failed to duplicate agent template', error);
    }
  }, [agents]);

  const deleteAgent = useCallback(async (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id));
    if (selectedAgentId === id) backToDashboard();
    try {
      await deleteAgentTemplate(id);
    } catch (error) {
      console.error('Failed to delete agent template', error);
    }
  }, [selectedAgentId, backToDashboard]);

  const createAgent = useCallback(async () => {
    if (creatingAgent) return;
    setCreatingAgent(true);
    setActionMessage(null);

    const newAgent: AgentData = {
      id: `agent-${Date.now()}`,
      name: '新建智能体',
      description: '请输入智能体描述...',
      icon: '🤖',
      color: '#6366f1',
      role: '',
      systemPrompt: '你是一个可靠的研究助手。请根据用户输入完成任务，并用清晰、可验证的方式输出结果。',
      model: defaultModel,
      temperature: 0.5,
      maxTokens: 2048,
      status: 'draft',
      skills: [],
      workflow: {
        nodes: [
          { id: 'n1', type: 'start', label: '用户输入', x: 50, y: 150 },
          {
            id: 'n2',
            type: 'llm',
            label: 'LLM 处理',
            x: 300,
            y: 150,
            config: {
              model: defaultModel,
              temperature: 0.5,
              max_tokens: 2048,
              system_prompt: '你是一个可靠的研究助手。请根据用户输入完成任务，并用清晰、可验证的方式输出结果。',
              inputs: { user_input: '{user_input}' },
            },
          },
          { id: 'n3', type: 'reply', label: '返回结果', x: 550, y: 150 },
        ],
        edges: [
          { from: 'n1', to: 'n2' },
          { from: 'n2', to: 'n3' },
        ],
      },
      lastModified: new Date().toISOString().split('T')[0],
      calls: 0,
    };

    try {
      const saved = await createAgentTemplate(newAgent);
      setAgents(prev => mergeDefaultAndSavedAgents([
        ...prev.filter(agent => !MOCK_AGENTS.some(item => item.id === agent.id)),
        saved,
      ]));
      setSearchQuery('');
      setActionMessage('新建智能体已保存到后端');
      openEditor(saved.id);
    } catch (error) {
      console.error('Failed to create agent template', error);
      setActionMessage('新建失败，请检查后端服务或浏览器控制台');
    } finally {
      setCreatingAgent(false);
    }
  }, [creatingAgent, defaultModel, openEditor]);

  const handleLogout = useCallback(() => {
    logout();
    router.push('/');
  }, [logout, router]);

  /* ═══ 渲染 ═══ */
  return (
    <div className="flex h-screen w-full bg-[#f7f8fa] overflow-hidden">
      {/* ═══ 左侧导航 ═══ */}
      <aside className={`shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${sideCollapsed ? 'w-16' : 'w-56'}`}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-gray-100 gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shrink-0">
            <RobotOutlined style={{ fontSize: '15px', color: '#fff' }} />
          </div>
          {!sideCollapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-800 leading-tight truncate">Agent Studio</h1>
              <p className="text-[10px] text-gray-400 truncate">多智能体管理平台</p>
            </div>
          )}
        </div>

        {/* 导航 */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {ADMIN_NAV.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveNav(item.id); if (view !== 'dashboard') backToDashboard(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all ${
                activeNav === item.id
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              } ${sideCollapsed ? 'justify-center' : ''}`}
            >
              <span style={{ fontSize: '15px' }}>{item.icon}</span>
              {!sideCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* 底部 */}
        <div className="p-2 border-t border-gray-100 space-y-0.5">
          <button
            onClick={() => setSideCollapsed(!sideCollapsed)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors ${sideCollapsed ? 'justify-center' : ''}`}
          >
            {sideCollapsed ? <MenuUnfoldOutlined style={{ fontSize: '14px' }} /> : <MenuFoldOutlined style={{ fontSize: '14px' }} />}
            {!sideCollapsed && <span>折叠菜单</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors ${sideCollapsed ? 'justify-center' : ''}`}
          >
            <LogoutOutlined style={{ fontSize: '14px' }} />
            {!sideCollapsed && <span>退出登录</span>}
          </button>
        </div>
      </aside>

      {/* ═══ 主内容区 ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {view === 'dashboard' && activeNav === 'agents' && (
          <AgentListView
            agents={filteredAgents}
            loadError={loadError}
            actionMessage={actionMessage}
            creatingAgent={creatingAgent}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            onEdit={openEditor}
            onOrchestrate={openOrchestration}
            onDuplicate={duplicateAgent}
            onDelete={deleteAgent}
            onCreate={createAgent}
          />
        )}
        {view === 'dashboard' && activeNav === 'skills' && (
          <SkillsMarketView />
        )}
        {view === 'dashboard' && activeNav === 'orchestration' && (
          <OrchestrationOverview agents={agents} onEdit={openOrchestration} />
        )}
        {view === 'dashboard' && activeNav === 'settings' && (
          <SystemSettingsView />
        )}
        {view === 'editor' && selectedAgent && (
          <AgentEditorView
            agent={selectedAgent}
            editorTab={editorTab}
            setEditorTab={setEditorTab}
            onBack={backToDashboard}
            onUpdate={(updates) => updateAgent(selectedAgent.id, updates)}
            onSave={() => saveAgent(selectedAgent.id)}
            onOrchestrate={() => openOrchestration(selectedAgent.id)}
          />
        )}
        {view === 'orchestration' && selectedAgent && (
          <OrchestrationEditor
            agent={selectedAgent}
            onBack={backToDashboard}
            onUpdate={(updates) => saveAgent(selectedAgent.id, updates)}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   智能体列表视图
   ═══════════════════════════════════════════════════════ */

function AgentListView({
  agents, loadError, actionMessage, creatingAgent, searchQuery, onSearch, onEdit, onOrchestrate, onDuplicate, onDelete, onCreate,
}: {
  agents: AgentData[];
  loadError: string | null;
  actionMessage: string | null;
  creatingAgent: boolean;
  searchQuery: string;
  onSearch: (q: string) => void;
  onEdit: (id: string) => void;
  onOrchestrate: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex-1 overflow-auto">
      {/* 顶栏 */}
      <div className="sticky top-0 z-10 bg-[#f7f8fa]/80 backdrop-blur-lg border-b border-gray-100">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">智能体管理</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {loadError || '管理和配置平台中的所有 AI 智能体'}
            </p>
            {actionMessage && (
              <p className={`text-xs mt-1 ${actionMessage.includes('失败') ? 'text-red-500' : 'text-emerald-600'}`}>
                {actionMessage}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: '13px' }} />
              <input
                value={searchQuery}
                onChange={e => onSearch(e.target.value)}
                placeholder="搜索智能体..."
                className="w-56 h-9 pl-9 pr-3 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
            <button
              onClick={onCreate}
              disabled={creatingAgent}
              className={`flex items-center gap-1.5 px-4 h-9 bg-primary text-white text-xs font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm ${
                creatingAgent ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <PlusOutlined style={{ fontSize: '12px' }} />
              {creatingAgent ? '创建中' : '新建智能体'}
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="px-6 pt-5 pb-2">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '全部智能体', value: agents.length, color: '#6366f1', bg: 'from-indigo-50 to-indigo-100/50' },
            { label: '运行中', value: agents.filter(a => a.status === 'active').length, color: '#10b981', bg: 'from-emerald-50 to-emerald-100/50' },
            { label: '草稿', value: agents.filter(a => a.status === 'draft').length, color: '#f59e0b', bg: 'from-amber-50 to-amber-100/50' },
            { label: '总调用次数', value: agents.reduce((s, a) => s + a.calls, 0).toLocaleString(), color: '#3b82f6', bg: 'from-blue-50 to-blue-100/50' },
          ].map(stat => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.bg} rounded-2xl p-4 border border-white/60`}>
              <p className="text-[11px] text-gray-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 智能体卡片网格 */}
      <div className="px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* 创建卡片 */}
          <button
            onClick={onCreate}
            disabled={creatingAgent}
            className={`group border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all min-h-[220px] ${
              creatingAgent ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <PlusOutlined className="text-gray-400 group-hover:text-primary text-xl transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 group-hover:text-primary transition-colors">
                {creatingAgent ? '正在创建...' : '创建新智能体'}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">从零开始配置一个 AI 智能体</p>
            </div>
          </button>

          {/* 智能体卡片 */}
          {agents.map(agent => {
            const status = STATUS_MAP[agent.status];
            return (
              <div
                key={agent.id}
                className="group bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                {/* 顶部色带 */}
                <div className="h-1" style={{ background: `linear-gradient(90deg, ${agent.color}, ${agent.color}66)` }} />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm"
                        style={{ background: `${agent.color}15` }}
                      >
                        {agent.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">{agent.name}</h3>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border mt-1 ${status.bg}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[12px] text-gray-500 leading-relaxed mb-4 line-clamp-2">
                    {agent.description}
                  </p>

                  {/* 技能标签 */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {agent.skills.filter(s => s.enabled).slice(0, 3).map(skill => (
                      <span key={skill.id} className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-gray-50 text-gray-500 rounded-lg border border-gray-100">
                        {SKILL_TYPE_ICON[skill.type]}
                        {skill.name}
                      </span>
                    ))}
                    {agent.skills.filter(s => s.enabled).length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-400 rounded-lg border border-gray-100">
                        +{agent.skills.filter(s => s.enabled).length - 3}
                      </span>
                    )}
                  </div>

                  {/* 底部信息和操作 */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span>{agent.model}</span>
                      <span>·</span>
                      <span>{agent.calls.toLocaleString()} 次调用</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(agent.id)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-primary transition-colors" title="编辑">
                        <EditOutlined style={{ fontSize: '12px' }} />
                      </button>
                      <button onClick={() => onOrchestrate(agent.id)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors" title="编排">
                        <ApartmentOutlined style={{ fontSize: '12px' }} />
                      </button>
                      <button onClick={() => onDuplicate(agent.id)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-amber-500 transition-colors" title="复制">
                        <CopyOutlined style={{ fontSize: '12px' }} />
                      </button>
                      <button onClick={() => onDelete(agent.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors" title="删除">
                        <DeleteOutlined style={{ fontSize: '12px' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   智能体编辑器
   ═══════════════════════════════════════════════════════ */

function AgentEditorView({
  agent, editorTab, setEditorTab, onBack, onUpdate, onSave, onOrchestrate,
}: {
  agent: AgentData;
  editorTab: EditorTab;
  setEditorTab: (t: EditorTab) => void;
  onBack: () => void;
  onUpdate: (updates: Partial<AgentData>) => void;
  onSave: () => void | Promise<void>;
  onOrchestrate: () => void;
}) {
  const TABS: { key: EditorTab; label: string; icon: React.ReactNode }[] = [
    { key: 'role', label: '角色设定', icon: <UserOutlined /> },
    { key: 'prompt', label: '提示词', icon: <FileTextOutlined /> },
    { key: 'skills', label: '技能配置', icon: <ToolOutlined /> },
    { key: 'settings', label: '模型设置', icon: <SettingOutlined /> },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 顶部导航 */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
            <LeftOutlined style={{ fontSize: '12px' }} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${agent.color}15` }}>
              {agent.icon}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">{agent.name}</h2>
              <p className="text-[10px] text-gray-400">{agent.id}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOrchestrate}
            className="flex items-center gap-1.5 px-3 h-8 text-xs text-gray-600 hover:text-primary bg-gray-50 hover:bg-primary/5 rounded-lg transition-colors"
          >
            <ApartmentOutlined style={{ fontSize: '12px' }} />
            工作流编排
          </button>
          <button className="flex items-center gap-1.5 px-3 h-8 text-xs text-gray-600 hover:text-primary bg-gray-50 hover:bg-primary/5 rounded-lg transition-colors">
            <EyeOutlined style={{ fontSize: '12px' }} />
            预览
          </button>
          <button
            onClick={() => { void onSave(); }}
            className="flex items-center gap-1.5 px-4 h-8 text-xs text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm font-medium"
          >
            <SaveOutlined style={{ fontSize: '12px' }} />
            保存
          </button>
        </div>
      </div>

      {/* Tab 栏 */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-6">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setEditorTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                editorTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-6">
        {editorTab === 'role' && (
          <div className="max-w-3xl space-y-6">
            <Section title="基本信息">
              <Field label="智能体名称">
                <input
                  value={agent.name}
                  onChange={e => onUpdate({ name: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </Field>
              <Field label="描述">
                <textarea
                  value={agent.description}
                  onChange={e => onUpdate({ description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="图标 Emoji">
                  <input
                    value={agent.icon}
                    onChange={e => onUpdate({ icon: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-primary/40 transition-all"
                  />
                </Field>
                <Field label="主题色">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={agent.color}
                      onChange={e => onUpdate({ color: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer"
                    />
                    <input
                      value={agent.color}
                      onChange={e => onUpdate({ color: e.target.value })}
                      className="flex-1 h-10 px-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-primary/40 transition-all font-mono"
                    />
                  </div>
                </Field>
              </div>
            </Section>
            <Section title="角色定义">
              <Field label="角色描述" hint="简洁描述该智能体的身份和专长">
                <textarea
                  value={agent.role}
                  onChange={e => onUpdate({ role: e.target.value })}
                  rows={3}
                  placeholder="例如：你是一位资深的学术文献分析专家，擅长阅读、理解和综合大量学术论文。"
                  className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                />
              </Field>
              <Field label="状态">
                <div className="flex gap-2">
                  {(['active', 'draft', 'disabled'] as const).map(s => {
                    const st = STATUS_MAP[s];
                    return (
                      <button
                        key={s}
                        onClick={() => onUpdate({ status: s })}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border-2 transition-all ${
                          agent.status === s
                            ? 'border-current font-semibold shadow-sm'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                        style={agent.status === s ? { color: st.color, borderColor: st.color, background: `${st.color}08` } : {}}
                      >
                        {st.icon}
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </Section>
          </div>
        )}

        {editorTab === 'prompt' && (
          <div className="max-w-3xl space-y-6">
            <Section title="系统提示词" hint="定义智能体的行为准则、能力范围和输出格式">
              <div className="relative">
                <textarea
                  value={agent.systemPrompt}
                  onChange={e => onUpdate({ systemPrompt: e.target.value })}
                  rows={20}
                  placeholder="请输入系统提示词...\n\n建议包含：\n1. 角色定义\n2. 核心能力\n3. 输出要求\n4. 限制条件"
                  className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none font-mono leading-relaxed"
                />
                <div className="absolute bottom-3 right-3 text-[10px] text-gray-400">
                  {agent.systemPrompt.length} 字符
                </div>
              </div>
            </Section>
            <Section title="提示词模板" hint="快速应用预设模板">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: '学术研究', desc: '适用于论文分析与写作', icon: <ReadOutlined /> },
                  { name: '代码助手', desc: '适用于编程和算法实现', icon: <CodeOutlined /> },
                  { name: '创意发散', desc: '适用于头脑风暴和创新', icon: <BulbOutlined /> },
                ].map(tpl => (
                  <button key={tpl.name} className="text-left p-3 border border-gray-200 rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all group">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-400 group-hover:text-primary transition-colors">{tpl.icon}</span>
                      <span className="text-xs font-medium text-gray-700">{tpl.name}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">{tpl.desc}</p>
                  </button>
                ))}
              </div>
            </Section>
          </div>
        )}

        {editorTab === 'skills' && (
          <div className="max-w-3xl space-y-6">
            <Section title="已启用技能" hint="当前智能体可使用的技能">
              {agent.skills.filter(s => s.enabled).length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">暂无启用的技能，请从下方选择</div>
              ) : (
                <div className="space-y-2">
                  {agent.skills.filter(s => s.enabled).map(skill => (
                    <div key={skill.id} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-primary/20 flex items-center justify-center text-primary">
                          {SKILL_TYPE_ICON[skill.type]}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-800">{skill.name}</p>
                          <p className="text-[10px] text-gray-400">{skill.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onUpdate({
                          skills: agent.skills.map(s => s.id === skill.id ? { ...s, enabled: false } : s),
                        })}
                        className="text-[10px] px-2.5 py-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            <Section title="可用技能" hint="选择要添加的技能">
              <div className="grid grid-cols-2 gap-3">
                {SKILL_TEMPLATES.filter(t => !agent.skills.find(s => s.id === t.id && s.enabled)).map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => {
                      const existing = agent.skills.find(s => s.id === skill.id);
                      if (existing) {
                        onUpdate({ skills: agent.skills.map(s => s.id === skill.id ? { ...s, enabled: true } : s) });
                      } else {
                        onUpdate({ skills: [...agent.skills, { ...skill, enabled: true }] });
                      }
                    }}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-primary/10 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                      {SKILL_TYPE_ICON[skill.type]}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">{skill.name}</p>
                      <p className="text-[10px] text-gray-400">{skill.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Section>
          </div>
        )}

        {editorTab === 'settings' && (
          <div className="max-w-3xl space-y-6">
            <Section title="模型配置">
              <Field label="模型" hint="可选择建议项，也可以直接输入任意兼容 OpenAI API 的模型名">
                <input
                  list="admin-agent-model-suggestions"
                  value={agent.model}
                  onChange={e => onUpdate({ model: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-primary/40 transition-all"
                />
                <datalist id="admin-agent-model-suggestions">
                  {MODEL_SUGGESTIONS.map(model => <option key={model} value={model} />)}
                </datalist>
              </Field>
              <Field label={`温度 (Temperature): ${agent.temperature}`} hint="越低越确定，越高越有创造性">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={agent.temperature}
                  onChange={e => onUpdate({ temperature: parseFloat(e.target.value) })}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>精确 (0)</span>
                  <span>平衡 (0.5)</span>
                  <span>创意 (1.0)</span>
                </div>
              </Field>
              <Field label={`最大输出 Token: ${agent.maxTokens}`}>
                <input
                  type="range"
                  min="256"
                  max="8192"
                  step="256"
                  value={agent.maxTokens}
                  onChange={e => onUpdate({ maxTokens: parseInt(e.target.value) })}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>256</span>
                  <span>4096</span>
                  <span>8192</span>
                </div>
              </Field>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   工作流编排编辑器
   ═══════════════════════════════════════════════════════ */

function OrchestrationEditor({
  agent, onBack, onUpdate,
}: {
  agent: AgentData;
  onBack: () => void;
  onUpdate: (updates: Partial<AgentData>) => void | Promise<void>;
}) {
  const NODE_W = 164;
  const NODE_H = 68;
  const CANVAS_W = 1800;
  const CANVAS_H = 900;

  const [nodes, setNodes] = useState<WorkflowNode[]>(() => agent.workflow.nodes.map(n => ({ ...n })));
  const [edges, setEdges] = useState<WorkflowEdge[]>(() => agent.workflow.edges.map(e => ({ ...e })));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeIdx, setSelectedEdgeIdx] = useState<number | null>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [connecting, setConnecting] = useState<{ fromId: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [editingLabel, setEditingLabel] = useState(false);
  const [editLabelText, setEditLabelText] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('请只回答：前端编排是否已经接通后端和模型？');
  const [testResult, setTestResult] = useState<AgentRunData | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;
  const connectingSourceNode = connecting ? nodes.find(n => n.id === connecting.fromId) ?? null : null;

  const TYPE_LABELS: Record<WorkflowNode['type'], string> = {
    start: '开始节点', llm: 'LLM 节点', tool: '工具节点',
    condition: '条件分支', reply: '回复节点', knowledge: '知识库',
  };
  const selectedNodeConfig = selectedNode?.config ?? {};

  const buildDefaultNodeConfig = useCallback((type: WorkflowNode['type']): WorkflowNodeConfig => {
    if (type === 'llm') {
      return {
        model: agent.model,
        temperature: agent.temperature,
        max_tokens: agent.maxTokens,
        system_prompt: agent.systemPrompt || agent.role || '你是一个可靠的研究助手。',
        inputs: { user_input: '{user_input}' },
      };
    }
    if (type === 'tool') {
      return {
        tools: agent.skills.filter(skill => skill.enabled).map(skill => skill.id),
        system_prompt: '根据用户输入判断是否需要调用工具，并输出工具处理后的结论。',
        inputs: { user_input: '{user_input}' },
      };
    }
    if (type === 'knowledge') {
      return {
        tools: ['sk-kb'],
        query_hint: '围绕用户输入检索本地知识库。',
        system_prompt: '优先检索知识库，再基于检索结果给出答案。',
        inputs: { user_input: '{user_input}' },
      };
    }
    if (type === 'condition') {
      return {
        condition_note: '在连线上填写分支标签，例如：及格 / 不及格 / 是 / 否。',
      };
    }
    if (type === 'reply') {
      return {
        reply_template: '返回上游节点的最终结果。',
      };
    }
    return {};
  }, [agent.model, agent.temperature, agent.maxTokens, agent.systemPrompt, agent.role, agent.skills]);

  const updateSelectedNode = useCallback((updates: Partial<WorkflowNode>) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(node => node.id === selectedNodeId ? { ...node, ...updates } : node));
  }, [selectedNodeId]);

  const updateSelectedNodeConfig = useCallback((updates: WorkflowNodeConfig) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(node => (
      node.id === selectedNodeId
        ? { ...node, config: { ...(node.config ?? {}), ...updates } }
        : node
    )));
  }, [selectedNodeId]);

  const toggleSelectedNodeTool = useCallback((toolId: string) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(node => {
      if (node.id !== selectedNodeId) return node;
      const currentTools = node.config?.tools ?? [];
      const nextTools = currentTools.includes(toolId)
        ? currentTools.filter(id => id !== toolId)
        : [...currentTools, toolId];
      return { ...node, config: { ...(node.config ?? {}), tools: nextTools } };
    }));
  }, [selectedNodeId]);

  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: e.clientX - rect.left + el.scrollLeft,
      y: e.clientY - rect.top + el.scrollTop,
    };
  }, []);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connecting) return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const pos = getCanvasPos(e);
    setDragging({ nodeId, offsetX: pos.x - node.x, offsetY: pos.y - node.y });
    setSelectedNodeId(nodeId);
    setSelectedEdgeIdx(null);
    setEditingLabel(false);
  }, [connecting, nodes, getCanvasPos]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    setMousePos(pos);
    if (!dragging) return;
    setNodes(prev => prev.map(n =>
      n.id === dragging.nodeId
        ? { ...n, x: Math.max(0, Math.min(CANVAS_W - NODE_W, pos.x - dragging.offsetX)), y: Math.max(0, Math.min(CANVAS_H - NODE_H, pos.y - dragging.offsetY)) }
        : n
    ));
  }, [dragging, getCanvasPos]);

  const handleCanvasMouseUp = useCallback(() => { setDragging(null); }, []);

  const handleCanvasClick = useCallback(() => {
    if (dragging) return;
    setSelectedNodeId(null);
    setSelectedEdgeIdx(null);
    setConnecting(null);
    setEditingLabel(false);
  }, [dragging]);

  const handleOutputPortClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setConnecting({ fromId: nodeId });
    setSelectedNodeId(null);
    setSelectedEdgeIdx(null);
  }, []);

  const handleInputPortClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!connecting) return;
    if (connecting.fromId === nodeId) { setConnecting(null); return; }
    const exists = edges.some(ed => ed.from === connecting.fromId && ed.to === nodeId);
    if (!exists) setEdges(prev => [...prev, { from: connecting.fromId, to: nodeId }]);
    setConnecting(null);
  }, [connecting, edges]);

  const addNode = useCallback((type: WorkflowNode['type']) => {
    const nodeDefaultLabels: Record<WorkflowNode['type'], string> = {
      start: '开始', llm: 'LLM 处理', tool: '工具调用',
      condition: '条件判断', reply: '输出回复', knowledge: '知识检索',
    };
    const el = containerRef.current;
    const cx = el ? el.scrollLeft + el.clientWidth / 2 : 400;
    const cy = el ? el.scrollTop + el.clientHeight / 2 : 300;
    const newNode: WorkflowNode = {
      id: `n-${Date.now()}`,
      type,
      label: nodeDefaultLabels[type],
      x: Math.max(0, cx - NODE_W / 2 + (Math.random() - 0.5) * 120),
      y: Math.max(0, cy - NODE_H / 2 + (Math.random() - 0.5) * 80),
      config: buildDefaultNodeConfig(type),
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setSelectedEdgeIdx(null);
    setConnecting(null);
  }, [buildDefaultNodeConfig]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    setSelectedNodeId(null);
  }, []);

  const deleteEdge = useCallback((idx: number) => {
    setEdges(prev => prev.filter((_, i) => i !== idx));
    setSelectedEdgeIdx(null);
  }, []);

  const commitLabel = useCallback(() => {
    if (!selectedNodeId) return;
    updateSelectedNode({ label: editLabelText });
    setEditingLabel(false);
  }, [selectedNodeId, editLabelText, updateSelectedNode]);

  const changeNodeType = useCallback((type: WorkflowNode['type']) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(n => (
      n.id === selectedNodeId
        ? { ...n, type, config: { ...buildDefaultNodeConfig(type), ...(n.config ?? {}) } }
        : n
    )));
  }, [selectedNodeId, buildDefaultNodeConfig]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onUpdate({ workflow: { nodes, edges } });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      console.error('Failed to save workflow', error);
      setSaveError('保存失败，请确认后端服务已启动');
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, onUpdate]);

  const handleRunTest = useCallback(async () => {
    if (!testInput.trim()) {
      setTestError('请输入测试内容');
      return;
    }

    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      await onUpdate({ workflow: { nodes, edges } });
      const result = await runAgentWorkflow(`agent_template_${agent.id}`, testInput.trim());
      setTestResult(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      console.error('Failed to run workflow test', error);
      setTestError('运行失败，请检查模型配置、节点连线或后端日志');
    } finally {
      setTesting(false);
    }
  }, [agent.id, nodes, edges, onUpdate, testInput]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 顶栏 */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
            <LeftOutlined style={{ fontSize: '12px' }} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${agent.color}15` }}>
              {agent.icon}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">工作流编排 · {agent.name}</h2>
              <p className="text-[10px] text-gray-400">{nodes.length} 个节点 · {edges.length} 条连线</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {connecting && (
            <span className="text-[11px] px-3 py-1.5 bg-blue-50 text-blue-500 rounded-full font-medium animate-pulse">
              点击目标节点左侧端口完成连接 · ESC 取消
            </span>
          )}
          {saveError && (
            <span className="text-[11px] px-3 py-1.5 bg-red-50 text-red-500 rounded-full font-medium">
              {saveError}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-1.5 px-4 h-8 text-xs rounded-lg shadow-sm font-medium transition-all ${
              saved ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:bg-primary/90'
            } ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {saved ? <CheckCircleFilled style={{ fontSize: '12px' }} /> : <SaveOutlined style={{ fontSize: '12px' }} />}
            {saving ? '保存中' : saved ? '已保存' : '保存'}
          </button>
          <button
            onClick={handleRunTest}
            disabled={testing || saving}
            className={`flex items-center gap-1.5 px-4 h-8 text-xs rounded-lg shadow-sm font-medium transition-all bg-emerald-600 text-white hover:bg-emerald-700 ${
              testing || saving ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <PlayCircleOutlined style={{ fontSize: '12px' }} />
            {testing ? '运行中' : '运行测试'}
          </button>
        </div>
      </div>

      {/* 画布 + 右侧面板 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 画布容器 */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto relative select-none"
          style={{
            background: 'radial-gradient(circle, #cbd5e1 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            cursor: connecting ? 'crosshair' : dragging ? 'grabbing' : 'default',
          }}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onClick={handleCanvasClick}
        >
          <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H }}>
            {/* SVG 连线层 */}
            <svg
              style={{ position: 'absolute', left: 0, top: 0, width: CANVAS_W, height: CANVAS_H, overflow: 'visible', zIndex: 1 }}
            >
              <defs>
                <marker id="oa" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
                </marker>
                <marker id="oa-sel" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#1a5c3a" />
                </marker>
                <marker id="oa-conn" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#3b82f6" />
                </marker>
              </defs>

              {/* 已有连线 */}
              {edges.map((edge, i) => {
                const fromN = nodes.find(n => n.id === edge.from);
                const toN = nodes.find(n => n.id === edge.to);
                if (!fromN || !toN) return null;
                const x1 = fromN.x + NODE_W + 10;
                const y1 = fromN.y + NODE_H / 2;
                const x2 = toN.x - 10;
                const y2 = toN.y + NODE_H / 2;
                const dx = Math.max(60, Math.abs(x2 - x1) * 0.5);
                const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                const isSel = selectedEdgeIdx === i;
                const midX = (x1 + x2) / 2;
                const midY = Math.min(y1, y2) - 14;
                return (
                  <g key={i}>
                    {/* 宽透明命中区 */}
                    <path
                      d={d} fill="none" stroke="#000" strokeWidth="14"
                      style={{ pointerEvents: 'all', cursor: 'pointer', opacity: 0 }}
                      onClick={(e) => { e.stopPropagation(); setSelectedEdgeIdx(i); setSelectedNodeId(null); }}
                    />
                    {/* 可见路径 */}
                    <path
                      d={d} fill="none"
                      stroke={isSel ? '#1a5c3a' : '#94a3b8'}
                      strokeWidth={isSel ? 2.5 : 2}
                      strokeDasharray={isSel ? undefined : '7 4'}
                      markerEnd={isSel ? 'url(#oa-sel)' : 'url(#oa)'}
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* 标签 */}
                    {edge.label && (
                      <g style={{ pointerEvents: 'none' }}>
                        <rect x={midX - 22} y={midY - 8} width={44} height={16} rx={4}
                          fill="white" stroke={isSel ? '#1a5c3a' : '#e2e8f0'} strokeWidth="1" />
                        <text x={midX} y={midY + 4} textAnchor="middle"
                          style={{ fontSize: '9px', fill: isSel ? '#1a5c3a' : '#6b7280' }}>
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 连接中的预览线 */}
              {connecting && connectingSourceNode && (
                <path
                  d={`M ${connectingSourceNode.x + NODE_W + 10} ${connectingSourceNode.y + NODE_H / 2} L ${mousePos.x} ${mousePos.y}`}
                  fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5 3"
                  markerEnd="url(#oa-conn)"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </svg>

            {/* 节点层 */}
            {nodes.map(node => {
              const st = NODE_STYLES[node.type];
              const isSel = selectedNodeId === node.id;
              return (
                <div
                  key={node.id}
                  style={{ position: 'absolute', left: node.x, top: node.y, width: NODE_W, height: NODE_H, zIndex: isSel ? 20 : 10 }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onClick={(e) => { e.stopPropagation(); if (!connecting) { setSelectedNodeId(node.id); setSelectedEdgeIdx(null); } }}
                >
                  {/* 输入端口 */}
                  <div
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition-transform hover:scale-125"
                    style={{
                      borderColor: connecting ? '#3b82f6' : st.color,
                      cursor: connecting ? 'crosshair' : 'default',
                      boxShadow: connecting ? '0 0 0 4px rgba(59,130,246,0.18)' : 'none',
                      zIndex: 30,
                    }}
                    onClick={(e) => handleInputPortClick(e, node.id)}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: connecting ? '#3b82f6' : `${st.color}90` }} />
                  </div>

                  {/* 节点卡片 */}
                  <div
                    className="w-full h-full rounded-xl border-2 bg-white transition-all"
                    style={{
                      borderColor: isSel ? st.color : `${st.color}45`,
                      boxShadow: isSel
                        ? `0 0 0 3px ${st.color}20, 0 4px 16px rgba(0,0,0,0.1)`
                        : '0 2px 8px rgba(0,0,0,0.06)',
                      cursor: dragging?.nodeId === node.id ? 'grabbing' : 'grab',
                    }}
                  >
                    <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0" style={{ background: st.bg, color: st.color }}>
                        {st.icon}
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: st.color }}>
                        {TYPE_LABELS[node.type].replace('节点', '').replace('分支', '').trim()}
                      </span>
                    </div>
                    <div className="px-3 pb-2.5">
                      <p className="text-xs font-semibold text-gray-700 truncate">{node.label}</p>
                      {node.type === 'llm' && node.config?.model && (
                        <p className="text-[9px] text-gray-400 truncate mt-0.5">{String(node.config.model)}</p>
                      )}
                      {node.type === 'tool' && node.config?.tools && node.config.tools.length > 0 && (
                        <p className="text-[9px] text-gray-400 truncate mt-0.5">{node.config.tools.length} 个工具</p>
                      )}
                    </div>
                  </div>

                  {/* 输出端口 */}
                  <div
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition-transform hover:scale-125"
                    style={{
                      borderColor: st.color,
                      cursor: 'crosshair',
                      boxShadow: connecting?.fromId === node.id ? `0 0 0 4px ${st.color}30` : 'none',
                      zIndex: 30,
                    }}
                    title="点击开始连线"
                    onClick={(e) => handleOutputPortClick(e, node.id)}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: st.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧属性/添加面板 */}
        <div className="w-60 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          {selectedNode ? (
            /* 节点属性面板 */
            <div className="flex-1 overflow-auto">
              <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-gray-100">
                <p className="text-xs font-bold text-gray-700">节点属性</p>
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <DeleteOutlined style={{ fontSize: '10px' }} /> 删除节点
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* 节点名称 */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">节点名称</label>
                  {editingLabel ? (
                    <input
                      autoFocus
                      value={editLabelText}
                      onChange={e => setEditLabelText(e.target.value)}
                      onBlur={commitLabel}
                      onKeyDown={e => { if (e.key === 'Enter') commitLabel(); if (e.key === 'Escape') setEditingLabel(false); }}
                      className="w-full h-8 px-2.5 text-xs bg-white border-2 border-primary/40 rounded-lg outline-none focus:ring-2 focus:ring-primary/15"
                    />
                  ) : (
                    <button
                      className="w-full flex items-center justify-between h-8 px-2.5 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                      onClick={() => { setEditLabelText(selectedNode.label); setEditingLabel(true); }}
                    >
                      <span className="truncate">{selectedNode.label}</span>
                      <EditOutlined style={{ fontSize: '10px' }} className="text-gray-400 group-hover:text-primary shrink-0 ml-1" />
                    </button>
                  )}
                </div>

                {/* 节点类型 */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">节点类型</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(NODE_STYLES) as WorkflowNode['type'][]).map(t => {
                      const st = NODE_STYLES[t];
                      const active = selectedNode.type === t;
                      return (
                        <button
                          key={t}
                          onClick={() => changeNodeType(t)}
                          className="flex items-center gap-1.5 p-2 rounded-lg border-2 transition-all text-left"
                          style={{
                            borderColor: active ? st.color : '#e5e7eb',
                            background: active ? st.bg : 'transparent',
                          }}
                        >
                          <span style={{ fontSize: '12px', color: st.color }}>{st.icon}</span>
                          <span className="text-[9px] font-semibold leading-tight" style={{ color: active ? st.color : '#6b7280' }}>
                            {TYPE_LABELS[t]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedNode.type === 'llm' && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">身份定义 / 系统提示词</label>
                      <textarea
                        value={String(selectedNodeConfig.system_prompt ?? '')}
                        onChange={e => updateSelectedNodeConfig({ system_prompt: e.target.value })}
                        rows={8}
                        placeholder="定义这个 LLM 节点的角色、任务边界、输出规范..."
                        className="w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">模型</label>
                      <input
                        list="node-model-suggestions"
                        value={String(selectedNodeConfig.model ?? agent.model)}
                        onChange={e => updateSelectedNodeConfig({ model: e.target.value })}
                        className="w-full h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-primary/40 transition-all"
                      />
                      <datalist id="node-model-suggestions">
                        {MODEL_SUGGESTIONS.map(model => <option key={model} value={model} />)}
                      </datalist>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">温度</label>
                        <input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={Number(selectedNodeConfig.temperature ?? agent.temperature)}
                          onChange={e => updateSelectedNodeConfig({ temperature: Number(e.target.value) })}
                          className="w-full h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-primary/40 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Max Tokens</label>
                        <input
                          type="number"
                          min="128"
                          step="128"
                          value={Number(selectedNodeConfig.max_tokens ?? agent.maxTokens)}
                          onChange={e => updateSelectedNodeConfig({ max_tokens: Number(e.target.value) })}
                          className="w-full h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-primary/40 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">输出格式</label>
                      <input
                        value={String(selectedNodeConfig.output_format ?? '')}
                        onChange={e => updateSelectedNodeConfig({ output_format: e.target.value })}
                        placeholder="如：一句话 / Markdown / JSON 字段..."
                        className="w-full h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-primary/40 transition-all"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.type === 'tool' && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">工具调用策略</label>
                      <textarea
                        value={String(selectedNodeConfig.system_prompt ?? '')}
                        onChange={e => updateSelectedNodeConfig({ system_prompt: e.target.value })}
                        rows={4}
                        placeholder="说明什么时候调用工具，以及如何整理工具结果..."
                        className="w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">可调用工具</label>
                      <div className="space-y-1.5">
                        {SKILL_TEMPLATES.map(skill => {
                          const checked = (selectedNodeConfig.tools ?? []).includes(skill.id);
                          return (
                            <button
                              key={skill.id}
                              onClick={() => toggleSelectedNodeTool(skill.id)}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                                checked ? 'border-primary/40 bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <span className="text-xs text-primary">{SKILL_TYPE_ICON[skill.type]}</span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-[11px] font-medium text-gray-700 truncate">{skill.name}</span>
                                <span className="block text-[9px] text-gray-400 truncate">{skill.description}</span>
                              </span>
                              <span className={`w-3.5 h-3.5 rounded border ${checked ? 'bg-primary border-primary' : 'border-gray-300'}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'knowledge' && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">检索任务说明</label>
                      <textarea
                        value={String(selectedNodeConfig.query_hint ?? '')}
                        onChange={e => updateSelectedNodeConfig({ query_hint: e.target.value })}
                        rows={4}
                        placeholder="说明要从知识库检索什么信息..."
                        className="w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">回答身份定义</label>
                      <textarea
                        value={String(selectedNodeConfig.system_prompt ?? '')}
                        onChange={e => updateSelectedNodeConfig({ system_prompt: e.target.value })}
                        rows={5}
                        placeholder="定义检索后如何分析和回答..."
                        className="w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.type === 'condition' && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        条件节点根据上一节点输出的路由决策选择连线。点击连线后，在“连线标签”里填写可匹配的条件，例如：及格、不及格、是、否。
                      </p>
                    </div>
                    <textarea
                      value={String(selectedNodeConfig.condition_note ?? '')}
                      onChange={e => updateSelectedNodeConfig({ condition_note: e.target.value })}
                      rows={3}
                      placeholder="补充这个条件节点的判定说明..."
                      className="w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none leading-relaxed"
                    />
                  </div>
                )}

                {selectedNode.type === 'reply' && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">回复模板</label>
                    <textarea
                      value={String(selectedNodeConfig.reply_template ?? '')}
                      onChange={e => updateSelectedNodeConfig({ reply_template: e.target.value })}
                      rows={4}
                      placeholder="描述最终回复应如何组织，例如保留结论、引用来源、列出步骤..."
                      className="w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none leading-relaxed"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : selectedEdgeIdx !== null && edges[selectedEdgeIdx] ? (
            /* 连线属性面板 */
            <div className="flex-1 overflow-auto">
              <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-gray-100">
                <p className="text-xs font-bold text-gray-700">连线属性</p>
                <button
                  onClick={() => deleteEdge(selectedEdgeIdx)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <DeleteOutlined style={{ fontSize: '10px' }} /> 删除连线
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">连线标签</label>
                  <input
                    value={edges[selectedEdgeIdx]?.label ?? ''}
                    onChange={e => setEdges(prev => prev.map((ed, i) => i === selectedEdgeIdx ? { ...ed, label: e.target.value || undefined } : ed))}
                    placeholder="如：成功 / 失败 / 是 / 否..."
                    className="w-full h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1.5">
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">路径</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-1 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium truncate flex-1">
                      {nodes.find(n => n.id === edges[selectedEdgeIdx]?.from)?.label ?? '—'}
                    </span>
                    <span className="text-gray-400 text-xs shrink-0">→</span>
                    <span className="text-[10px] px-2 py-1 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium truncate flex-1">
                      {nodes.find(n => n.id === edges[selectedEdgeIdx]?.to)?.label ?? '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 添加节点面板 */
            <div className="flex-1 overflow-auto">
              <div className="px-4 pt-4 pb-2 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-700">添加节点</p>
                <p className="text-[10px] text-gray-400 mt-0.5">点击添加到画布中央</p>
              </div>
              <div className="p-3 space-y-1.5">
                {(Object.entries(NODE_STYLES) as [WorkflowNode['type'], typeof NODE_STYLES[WorkflowNode['type']]][]).map(([type, st]) => (
                  <button
                    key={type}
                    onClick={() => addNode(type)}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0" style={{ background: st.bg, color: st.color }}>
                      {st.icon}
                    </div>
                    <span className="text-[11px] font-medium text-gray-600 group-hover:text-primary transition-colors">
                      {TYPE_LABELS[type]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
	          )}

	          {/* 运行测试 */}
	          <div className="shrink-0 p-3 border-t border-gray-100 bg-white">
	            <div className="flex items-center justify-between mb-2">
	              <p className="text-xs font-bold text-gray-700">运行测试</p>
	              {testResult && (
	                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">
	                  {testResult.status}
	                </span>
	              )}
	            </div>
	            <textarea
	              value={testInput}
	              onChange={e => setTestInput(e.target.value)}
	              rows={3}
	              className="w-full resize-none px-2.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
	            />
	            <button
	              onClick={handleRunTest}
	              disabled={testing || saving}
	              className={`mt-2 w-full flex items-center justify-center gap-1.5 h-8 text-xs rounded-lg font-medium transition-all bg-emerald-600 text-white hover:bg-emerald-700 ${
	                testing || saving ? 'opacity-70 cursor-not-allowed' : ''
	              }`}
	            >
	              <PlayCircleOutlined style={{ fontSize: '12px' }} />
	              {testing ? '运行中...' : '运行当前编排'}
	            </button>
	            {testError && (
	              <p className="mt-2 text-[11px] leading-relaxed text-red-500">{testError}</p>
	            )}
	            {testResult && (
	              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
	                <p className="text-[10px] font-semibold text-emerald-700 mb-1">模型输出</p>
	                <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
	                  {testResult.final_output || '执行完成，但没有返回内容'}
	                </p>
	                <p className="mt-2 text-[10px] text-gray-400">Session #{testResult.session_id}</p>
	              </div>
	            )}
	          </div>

	          {/* 操作提示 */}
	          <div className="shrink-0 p-3 border-t border-gray-100 bg-gray-50/50">
            <div className="space-y-0.5 text-[10px] text-gray-400 leading-relaxed">
              <p>· 拖拽节点可自由移动</p>
              <p>· 点击右侧 <span className="text-gray-500 font-medium">●</span> 开始连线</p>
              <p>· 点击连线可编辑标签/删除</p>
              <p>· 点击节点查看/修改属性</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   技能市场视图
   ═══════════════════════════════════════════════════════ */

function SkillsMarketView() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-4 border-b border-gray-100 bg-[#f7f8fa]/80 backdrop-blur-lg">
        <h2 className="text-lg font-bold text-gray-900">技能市场</h2>
        <p className="text-xs text-gray-400 mt-0.5">浏览和管理所有可用的智能体技能</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {SKILL_TEMPLATES.map(skill => (
            <div key={skill.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  {SKILL_TYPE_ICON[skill.type]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{skill.name}</h3>
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded-md border border-gray-100">{skill.type}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">{skill.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-[10px] text-gray-400">可用于所有智能体</span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium">可用</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   编排总览
   ═══════════════════════════════════════════════════════ */

function OrchestrationOverview({ agents, onEdit }: { agents: AgentData[]; onEdit: (id: string) => void }) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-4 border-b border-gray-100 bg-[#f7f8fa]/80 backdrop-blur-lg">
        <h2 className="text-lg font-bold text-gray-900">编排总览</h2>
        <p className="text-xs text-gray-400 mt-0.5">查看所有智能体的工作流编排状态</p>
      </div>
      <div className="p-6 space-y-4">
        {agents.map(agent => (
          <div key={agent.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${agent.color}15` }}>
                  {agent.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{agent.name}</h3>
                  <p className="text-[10px] text-gray-400">{agent.workflow.nodes.length} 节点 · {agent.workflow.edges.length} 连线</p>
                </div>
              </div>
              <button
                onClick={() => onEdit(agent.id)}
                className="flex items-center gap-1.5 px-3 h-8 text-xs text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
              >
                <EditOutlined style={{ fontSize: '11px' }} />
                编辑编排
              </button>
            </div>
            {/* 迷你工作流预览 */}
            <div className="flex items-center gap-2 overflow-x-auto py-2">
              {agent.workflow.nodes.map((node, i) => {
                const style = NODE_STYLES[node.type];
                return (
                  <React.Fragment key={node.id}>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shrink-0" style={{ borderColor: `${style.color}30`, background: style.bg }}>
                      <span style={{ color: style.color, fontSize: '11px' }}>{style.icon}</span>
                      <span className="text-[10px] font-medium text-gray-700 whitespace-nowrap">{node.label}</span>
                    </div>
                    {i < agent.workflow.nodes.length - 1 && (
                      <span className="text-gray-300 shrink-0">→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   系统设置
   ═══════════════════════════════════════════════════════ */

function SystemSettingsView() {
  const [apiKey, setApiKey] = useState('');
  const [maskedApiKey, setMaskedApiKey] = useState('***');
  const [baseUrl, setBaseUrl] = useState('https://api.siliconflow.cn/v1');
  const [defaultModel, setDefaultModel] = useState('Qwen/Qwen2.5-7B-Instruct');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    let alive = true;
    getSystemConfig()
      .then(config => {
        if (!alive) return;
        setMaskedApiKey(config.llm_api_key_masked || '***');
        setBaseUrl(config.llm_base_url || 'https://api.siliconflow.cn/v1');
        setDefaultModel(config.llm_model_default || 'Qwen/Qwen2.5-7B-Instruct');
      })
      .catch(error => {
        console.error('Failed to load system config', error);
        if (!alive) return;
        setStatusType('error');
        setStatusMessage('读取配置失败，请确认后端服务可用');
      });
    return () => { alive = false; };
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await updateSystemConfig({
        ...(apiKey.trim() ? { llm_api_key: apiKey.trim() } : {}),
        llm_base_url: baseUrl.trim(),
        llm_model_default: defaultModel.trim(),
      });
      setStatusType('success');
      setStatusMessage('配置已更新，新的模型调用会立即生效');
      if (apiKey.trim()) {
        setMaskedApiKey(`${apiKey.trim().slice(0, 3)}***${apiKey.trim().slice(-4)}`);
        setApiKey('');
      }
    } catch (error) {
      console.error('Failed to save system config', error);
      setStatusType('error');
      setStatusMessage('保存失败，请检查后端服务或配置内容');
    } finally {
      setSaving(false);
    }
  }, [apiKey, baseUrl, defaultModel]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-4 border-b border-gray-100 bg-[#f7f8fa]/80 backdrop-blur-lg">
        <h2 className="text-lg font-bold text-gray-900">系统设置</h2>
        <p className="text-xs text-gray-400 mt-0.5">全局参数与平台配置</p>
      </div>
      <div className="p-6 max-w-2xl space-y-6">
        <Section title="模型服务配置" hint="兼容 OpenAI API 的服务都可以填，比如 SiliconFlow、DashScope 或自建网关">
          <Field label="API Key">
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={`当前: ${maskedApiKey}，留空则不修改`}
              className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-primary/40 transition-all font-mono"
            />
          </Field>
          <Field label="Base URL">
            <input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://api.siliconflow.cn/v1"
              className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-primary/40 transition-all font-mono"
            />
          </Field>
          <Field label="默认模型" hint="可选择建议项，也可以手动输入模型 ID">
            <input
              list="admin-system-model-suggestions"
              value={defaultModel}
              onChange={e => setDefaultModel(e.target.value)}
              placeholder="Qwen/Qwen2.5-7B-Instruct"
              className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-primary/40 transition-all font-mono"
            />
            <datalist id="admin-system-model-suggestions">
              {MODEL_SUGGESTIONS.map(model => <option key={model} value={model} />)}
            </datalist>
          </Field>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !baseUrl.trim() || !defaultModel.trim()}
              className={`flex items-center gap-1.5 px-4 h-9 text-xs text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors shadow-sm font-medium ${
                saving ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <SaveOutlined style={{ fontSize: '12px' }} />
              {saving ? '保存中' : '保存配置'}
            </button>
            {statusMessage && (
              <span className={`text-xs ${statusType === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                {statusMessage}
              </span>
            )}
          </div>
        </Section>
        <Section title="平台信息">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] text-gray-400 mb-1">平台版本</p>
              <p className="font-medium text-gray-700">v2.1.0</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] text-gray-400 mb-1">智能体数量上限</p>
              <p className="font-medium text-gray-700">20 个</p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   工具组件
   ═══════════════════════════════════════════════════════ */

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {hint && <span className="font-normal text-gray-400 ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
