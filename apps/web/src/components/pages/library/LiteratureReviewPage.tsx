'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  SearchOutlined,
  CheckCircleFilled,
  FileTextOutlined,
  TableOutlined,
  ApartmentOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  CalendarOutlined,
  TeamOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  NodeIndexOutlined,
  BranchesOutlined,
} from '@ant-design/icons';

/* ═══════════════════════════════════════════════════════
   类型定义
   ═══════════════════════════════════════════════════════ */

interface Paper {
  id: string;
  title: string;
  authors: string;
  year: number;
  venue: string;
  abstract: string;
}

interface ComparisonRow {
  paperId: string;
  shortName: string;
  year: number;
  // 模型架构
  encoderOnly: boolean;
  decoderOnly: boolean;
  encoderDecoder: boolean;
  // 训练范式
  pretraining: boolean;
  instructTuning: boolean;
  rlhf: boolean;
  // 能力维度
  reasoning: boolean;
  codeGen: boolean;
  multimodal: boolean;
  // 特性
  openSource: boolean;
  chineseOpt: boolean;
}

interface RoadmapEra {
  year: string;
  title: string;
  color: string;
  papers: { id: string; name: string; tag: string; abstract?: string }[];
}

interface MindMapNode {
  id: string;
  label: string;
  color?: string;
  children: MindMapNode[];
}

/* ═══════════════════════════════════════════════════════
   Mock 数据
   ═══════════════════════════════════════════════════════ */

const MOCK_PAPERS: Paper[] = [
  {
    id: 'p1',
    title: 'Attention Is All You Need',
    authors: 'Vaswani, Shazeer, Parmar et al.',
    year: 2017,
    venue: 'NeurIPS 2017',
    abstract: '提出 Transformer 架构，完全基于注意力机制，取代了传统 RNN/CNN 在序列建模中的地位，成为现代大语言模型的基础架构。',
  },
  {
    id: 'p2',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers',
    authors: 'Devlin, Chang, Lee, Toutanova',
    year: 2019,
    venue: 'NAACL 2019',
    abstract: '提出双向预训练语言模型 BERT，通过掩码语言模型和下一句预测任务进行预训练，在多项 NLP 基准上取得突破性成绩。',
  },
  {
    id: 'p3',
    title: 'Language Models are Few-Shot Learners (GPT-3)',
    authors: 'Brown, Mann, Ryder et al.',
    year: 2020,
    venue: 'NeurIPS 2020',
    abstract: 'GPT-3 展示了 1750 亿参数语言模型的少样本学习能力，无需微调即可通过提示完成多种 NLP 任务。',
  },
  {
    id: 'p4',
    title: 'Retrieval-Augmented Generation (RAG)',
    authors: 'Lewis, Perez, Piktus et al.',
    year: 2020,
    venue: 'NeurIPS 2020',
    abstract: '提出检索增强生成框架，将外部知识库检索与语言模型生成相结合，显著提升知识密集型任务的表现。',
  },
  {
    id: 'p5',
    title: 'LoRA: Low-Rank Adaptation of Large Language Models',
    authors: 'Hu, Shen, Wallis et al.',
    year: 2021,
    venue: 'ICLR 2022',
    abstract: '提出低秩适配方法 LoRA，通过冻结预训练权重并注入低秩矩阵实现高效微调，大幅降低训练成本。',
  },
  {
    id: 'p6',
    title: 'Training LMs to Follow Instructions (InstructGPT)',
    authors: 'Ouyang, Wu, Jiang et al.',
    year: 2022,
    venue: 'NeurIPS 2022',
    abstract: '提出基于人类反馈的强化学习（RLHF）方法训练语言模型遵循人类指令，显著提升模型输出与人类意图的对齐程度。',
  },
  {
    id: 'p7',
    title: 'Chain-of-Thought Prompting Elicits Reasoning',
    authors: 'Wei, Wang, Schuurmans et al.',
    year: 2022,
    venue: 'NeurIPS 2022',
    abstract: '提出思维链提示方法，通过在提示中加入中间推理步骤，显著提升大语言模型在数学和逻辑推理任务上的表现。',
  },
  {
    id: 'p8',
    title: 'LLaMA: Open and Efficient Foundation Language Models',
    authors: 'Touvron, Lavril, Izacard et al.',
    year: 2023,
    venue: 'arXiv 2023',
    abstract: 'Meta 发布的开源大语言模型系列，证明在较小规模下通过充分训练可达到与更大模型相当的性能。',
  },
  {
    id: 'p9',
    title: 'GPT-4 Technical Report',
    authors: 'OpenAI',
    year: 2023,
    venue: 'arXiv 2023',
    abstract: 'GPT-4 是一个大规模多模态模型，能同时处理文本和图像输入，在多项专业考试中达到人类水平的表现。',
  },
  {
    id: 'p10',
    title: 'PaLM 2 Technical Report',
    authors: 'Anil, Dai, Firat et al.',
    year: 2023,
    venue: 'arXiv 2023',
    abstract: 'Google 发布的新一代语言模型，在推理、多语言和代码生成能力上有显著提升，支持超过 100 种语言。',
  },
];

const COMPARISON_DATA: ComparisonRow[] = [
  { paperId: 'p1', shortName: 'Transformer', year: 2017, encoderOnly: false, decoderOnly: false, encoderDecoder: true, pretraining: false, instructTuning: false, rlhf: false, reasoning: false, codeGen: false, multimodal: false, openSource: true, chineseOpt: false },
  { paperId: 'p2', shortName: 'BERT', year: 2019, encoderOnly: true, decoderOnly: false, encoderDecoder: false, pretraining: true, instructTuning: false, rlhf: false, reasoning: false, codeGen: false, multimodal: false, openSource: true, chineseOpt: true },
  { paperId: 'p3', shortName: 'GPT-3', year: 2020, encoderOnly: false, decoderOnly: true, encoderDecoder: false, pretraining: true, instructTuning: false, rlhf: false, reasoning: true, codeGen: true, multimodal: false, openSource: false, chineseOpt: false },
  { paperId: 'p4', shortName: 'RAG', year: 2020, encoderOnly: false, decoderOnly: false, encoderDecoder: true, pretraining: true, instructTuning: false, rlhf: false, reasoning: true, codeGen: false, multimodal: false, openSource: true, chineseOpt: false },
  { paperId: 'p5', shortName: 'LoRA', year: 2021, encoderOnly: false, decoderOnly: true, encoderDecoder: true, pretraining: false, instructTuning: true, rlhf: false, reasoning: false, codeGen: false, multimodal: false, openSource: true, chineseOpt: false },
  { paperId: 'p6', shortName: 'InstructGPT', year: 2022, encoderOnly: false, decoderOnly: true, encoderDecoder: false, pretraining: true, instructTuning: true, rlhf: true, reasoning: true, codeGen: true, multimodal: false, openSource: false, chineseOpt: false },
  { paperId: 'p7', shortName: 'CoT', year: 2022, encoderOnly: false, decoderOnly: true, encoderDecoder: false, pretraining: false, instructTuning: false, rlhf: false, reasoning: true, codeGen: false, multimodal: false, openSource: false, chineseOpt: false },
  { paperId: 'p8', shortName: 'LLaMA', year: 2023, encoderOnly: false, decoderOnly: true, encoderDecoder: false, pretraining: true, instructTuning: true, rlhf: false, reasoning: true, codeGen: true, multimodal: false, openSource: true, chineseOpt: true },
  { paperId: 'p9', shortName: 'GPT-4', year: 2023, encoderOnly: false, decoderOnly: true, encoderDecoder: false, pretraining: true, instructTuning: true, rlhf: true, reasoning: true, codeGen: true, multimodal: true, openSource: false, chineseOpt: true },
  { paperId: 'p10', shortName: 'PaLM 2', year: 2023, encoderOnly: false, decoderOnly: true, encoderDecoder: false, pretraining: true, instructTuning: true, rlhf: true, reasoning: true, codeGen: true, multimodal: true, openSource: false, chineseOpt: true },
];

const ROADMAP_DATA: RoadmapEra[] = [
  {
    year: '2017',
    title: 'Transformer 架构奠基',
    color: '#6366f1',
    papers: [{ id: 'p1', name: 'Transformer', tag: '自注意力机制' }],
  },
  {
    year: '2019',
    title: '预训练范式确立',
    color: '#3b82f6',
    papers: [{ id: 'p2', name: 'BERT', tag: '双向编码' }],
  },
  {
    year: '2020',
    title: '规模效应与检索增强',
    color: '#0ea5e9',
    papers: [
      { id: 'p3', name: 'GPT-3', tag: '175B 参数' },
      { id: 'p4', name: 'RAG', tag: '检索增强生成' },
    ],
  },
  {
    year: '2021',
    title: '高效微调探索',
    color: '#14b8a6',
    papers: [{ id: 'p5', name: 'LoRA', tag: '低秩适配' }],
  },
  {
    year: '2022',
    title: '对齐技术与推理增强',
    color: '#1a5c3a',
    papers: [
      { id: 'p6', name: 'InstructGPT', tag: 'RLHF 对齐' },
      { id: 'p7', name: 'CoT', tag: '思维链推理' },
    ],
  },
  {
    year: '2023',
    title: '多模态与开源生态',
    color: '#f59e0b',
    papers: [
      { id: 'p9', name: 'GPT-4', tag: '多模态' },
      { id: 'p8', name: 'LLaMA', tag: '开源' },
      { id: 'p10', name: 'PaLM 2', tag: '多语言' },
    ],
  },
];

const INITIAL_MINDMAP: MindMapNode = {
  id: 'mm-root',
  label: '大语言模型研究综述',
  color: '#1a5c3a',
  children: [
    {
      id: 'mm-arch',
      label: '架构基础',
      color: '#6366f1',
      children: [
        { id: 'mm-transformer', label: 'Transformer (2017)\n自注意力机制奠基', color: '#818cf8', children: [
          { id: 'mm-encoder', label: 'Encoder 路线\nBERT · 双向理解', color: '#a5b4fc', children: [] },
          { id: 'mm-decoder', label: 'Decoder 路线\nGPT 系列 · 自回归生成', color: '#a5b4fc', children: [] },
          { id: 'mm-encdec', label: 'Enc-Dec 路线\nT5 · RAG 检索增强', color: '#a5b4fc', children: [] },
        ]},
      ],
    },
    {
      id: 'mm-train',
      label: '训练与对齐',
      color: '#1a5c3a',
      children: [
        { id: 'mm-pretrain', label: '大规模预训练\nGPT-3 · 175B 参数\n规模涌现能力', color: '#34d399', children: [] },
        { id: 'mm-sft', label: '指令微调 SFT\nInstructGPT · 遵循指令', color: '#34d399', children: [
          { id: 'mm-rlhf', label: 'RLHF 人类对齐\n安全性 · 有用性', color: '#6ee7b7', children: [] },
        ]},
        { id: 'mm-efficient', label: '高效微调\nLoRA · 低秩适配\n降低 99% 训练参数', color: '#34d399', children: [] },
      ],
    },
    {
      id: 'mm-ability',
      label: '能力增强',
      color: '#f59e0b',
      children: [
        { id: 'mm-reason', label: '推理能力\nChain-of-Thought\n思维链逐步推导', color: '#fbbf24', children: [
          { id: 'mm-math', label: '数学推理\n准确率提升 40%+', color: '#fcd34d', children: [] },
          { id: 'mm-logic', label: '逻辑推理\n多步骤复杂问题', color: '#fcd34d', children: [] },
        ]},
        { id: 'mm-multimodal', label: '多模态融合\nGPT-4 · 图文理解\n视觉问答 · 图表分析', color: '#fbbf24', children: [] },
        { id: 'mm-code', label: '代码生成\nCodex · Copilot\n自动编程助手', color: '#fbbf24', children: [] },
      ],
    },
    {
      id: 'mm-ecosystem',
      label: '开源生态与应用',
      color: '#ef4444',
      children: [
        { id: 'mm-open', label: 'LLaMA 开源系列\n小模型高性能\n社区繁荣', color: '#f87171', children: [
          { id: 'mm-finetune', label: 'Alpaca · Vicuna\n指令微调衍生', color: '#fca5a5', children: [] },
        ]},
        { id: 'mm-multilang', label: 'PaLM 2 多语言\n100+ 语言支持\n跨语言迁移', color: '#f87171', children: [] },
        { id: 'mm-rag-app', label: 'RAG 应用落地\n知识库问答\n企业搜索增强', color: '#f87171', children: [] },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════════════ */

type ActiveTab = 'table' | 'mindmap' | 'roadmap';

export default function LiteratureReviewPage() {
  const [papers] = useState<Paper[]>(MOCK_PAPERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['p1', 'p2', 'p3', 'p6', 'p8', 'p9']));
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('table');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(true);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [tableData, setTableData] = useState<ComparisonRow[]>(COMPARISON_DATA);
  const [mindMapData, setMindMapData] = useState<MindMapNode>(INITIAL_MINDMAP);
  const [roadmapData, setRoadmapData] = useState<RoadmapEra[]>(ROADMAP_DATA);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [tableHeaders, setTableHeaders] = useState({
    groups: { arch: '模型架构', train: '训练范式', ability: '能力维度', feature: '特性' },
    fields: {
      encoderOnly: 'Encoder', decoderOnly: 'Decoder', encoderDecoder: 'Enc-Dec',
      pretraining: '预训练', instructTuning: '指令微调', rlhf: 'RLHF',
      reasoning: '推理增强', codeGen: '代码生成', multimodal: '多模态',
      openSource: '开源', chineseOpt: '中文优化'
    }
  });

  const filteredPapers = useMemo(() => {
    if (!search.trim()) return papers;
    const q = search.toLowerCase();
    return papers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.authors.toLowerCase().includes(q) ||
        p.venue.toLowerCase().includes(q)
    );
  }, [papers, search]);

  const togglePaper = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setIsGenerated(false);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(papers.map((p) => p.id)));
    setIsGenerated(false);
  }, [papers]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setIsGenerated(false);
  }, []);

  const handleGenerate = useCallback(() => {
    if (selectedIds.size < 2) return;
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
    }, 1500);
  }, [selectedIds]);

  const selectedComparison = useMemo(
    () => tableData.filter((r) => selectedIds.has(r.paperId)),
    [selectedIds, tableData]
  );

  const selectedRoadmap = useMemo(
    () =>
      roadmapData.map((era) => ({
        ...era,
        papers: era.papers.filter((p) => selectedIds.has(p.id)),
      })).filter((era) => era.papers.length > 0),
    [selectedIds, roadmapData]
  );

  const toggleCell = useCallback((paperId: string, field: keyof ComparisonRow) => {
    if (!editMode) return;
    setTableData(prev => prev.map(r =>
      r.paperId === paperId ? { ...r, [field]: !r[field] } : r
    ));
  }, [editMode]);

  const startEditNode = useCallback((id: string, text: string) => {
    setEditingNode(id);
    setEditingText(text);
  }, []);

  const updateMindMapNode = useCallback((root: MindMapNode, id: string, newLabel: string): MindMapNode => {
    if (root.id === id) return { ...root, label: newLabel };
    return { ...root, children: root.children.map(c => updateMindMapNode(c, id, newLabel)) };
  }, []);

  const addMindMapChild = useCallback((parentId: string) => {
    const addChild = (node: MindMapNode): MindMapNode => {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, { id: `mm-${Date.now()}`, label: '新节点', children: [] }] };
      }
      return { ...node, children: node.children.map(addChild) };
    };
    setMindMapData(prev => addChild(prev));
  }, []);

  const deleteMindMapNode = useCallback((nodeId: string) => {
    const remove = (node: MindMapNode): MindMapNode => ({
      ...node, children: node.children.filter(c => c.id !== nodeId).map(remove)
    });
    setMindMapData(prev => remove(prev));
  }, []);

  /* ── 渲染：对比勾选标记（编辑模式可点击切换） ── */
  const Mark = ({ value, paperId, field }: { value: boolean; paperId?: string; field?: keyof ComparisonRow }) => (
    <span
      onClick={() => paperId && field && toggleCell(paperId, field)}
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs transition-all ${
        value
          ? 'bg-primary/10 text-primary'
          : 'bg-gray-50 text-gray-300'
      } ${editMode && paperId ? 'cursor-pointer hover:scale-125 hover:shadow-sm' : ''}`}
    >
      {value ? <CheckOutlined style={{ fontSize: '10px' }} /> : <CloseOutlined style={{ fontSize: '9px' }} />}
    </span>
  );

  return (
    <div className="flex h-full overflow-hidden bg-white">
      {/* ═══ 左侧：论文选择面板 ═══ */}
      <div className="w-[300px] shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/50">
        {/* 标题 */}
        <div className="px-4 pt-5 pb-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileTextOutlined style={{ fontSize: '14px' }} className="text-primary" />
            论文选择
          </h2>
          <p className="text-[11px] text-gray-400 mt-1">选择论文后点击「生成综述」分析文献</p>
        </div>

        {/* 搜索 */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white focus-within:border-primary/40 transition-colors">
            <SearchOutlined style={{ color: '#9ca3af', fontSize: '13px' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索论文标题、作者..."
              className="flex-1 bg-transparent text-xs text-gray-700 outline-none placeholder-gray-400"
            />
          </div>
        </div>

        {/* 全选/取消 */}
        <div className="px-4 pb-2 flex items-center justify-between text-[11px]">
          <span className="text-gray-500">
            已选 <span className="font-semibold text-primary">{selectedIds.size}</span> / {papers.length} 篇
          </span>
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="text-primary hover:underline">全选</button>
            <button onClick={deselectAll} className="text-gray-400 hover:text-gray-600">清空</button>
          </div>
        </div>

        {/* 论文列表 */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
          {filteredPapers.map((paper) => {
            const selected = selectedIds.has(paper.id);
            return (
              <button
                key={paper.id}
                onClick={() => togglePaper(paper.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-150 ${
                  selected
                    ? 'border-primary/30 bg-primary/5 shadow-sm'
                    : 'border-transparent bg-white hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      selected
                        ? 'bg-primary border-primary'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {selected && <CheckOutlined style={{ fontSize: '8px', color: '#fff' }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold leading-snug mb-1 ${selected ? 'text-gray-900' : 'text-gray-700'}`}>
                      {paper.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-0.5">
                        <TeamOutlined style={{ fontSize: '9px' }} />
                        {paper.authors.split(',')[0]} et al.
                      </span>
                      <span className="flex items-center gap-0.5">
                        <CalendarOutlined style={{ fontSize: '9px' }} />
                        {paper.year}
                      </span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                      {paper.venue}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 生成按钮 */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white">
          <button
            onClick={handleGenerate}
            disabled={selectedIds.size < 2 || isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            style={{
              background:
                selectedIds.size >= 2 && !isGenerating
                  ? 'linear-gradient(135deg, #1a5c3a 0%, #166534 100%)'
                  : '#d1d5db',
            }}
          >
            {isGenerating ? (
              <>
                <LoadingOutlined style={{ fontSize: '14px' }} />
                <span>正在分析...</span>
              </>
            ) : (
              <>
                <ThunderboltOutlined style={{ fontSize: '14px' }} />
                <span>生成综述</span>
              </>
            )}
          </button>
          {selectedIds.size < 2 && (
            <p className="text-center text-[10px] text-gray-400 mt-1.5">请至少选择 2 篇论文</p>
          )}
        </div>
      </div>

      {/* ═══ 右侧：主内容区 ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Tab 栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'table'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TableOutlined style={{ fontSize: '12px' }} />
              文献对比表
            </button>
            <button
              onClick={() => setActiveTab('mindmap')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'mindmap'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BranchesOutlined style={{ fontSize: '12px' }} />
              文献思维导图
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'roadmap'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ApartmentOutlined style={{ fontSize: '12px' }} />
              研究脉络图
            </button>
          </div>

          {isGenerated && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditMode(!editMode); setEditingNode(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  editMode
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-500 hover:text-primary hover:bg-primary/5'
                }`}
              >
                <EditOutlined style={{ fontSize: '12px' }} />
                {editMode ? '退出编辑' : '编辑模式'}
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                <DownloadOutlined style={{ fontSize: '12px' }} />
                导出
              </button>
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-600">AI 正在分析 {selectedIds.size} 篇文献...</p>
              <p className="text-xs text-gray-400 mt-1">生成对比表格与研究脉络图</p>
            </div>
          ) : !isGenerated ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ThunderboltOutlined style={{ fontSize: '40px', marginBottom: '16px' }} className="text-gray-300" />
              <p className="text-sm text-gray-500">选择论文后点击「生成综述」</p>
              <p className="text-xs text-gray-400 mt-1">AI 将自动分析文献并生成对比表和研究脉络</p>
            </div>
          ) : activeTab === 'table' ? (
            /* ═══ 文献对比表 ═══ */
            <div className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-800">Summary of Selected Literature</h3>
                <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                  {selectedComparison.length} 篇
                </span>
                {editMode && (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full font-medium animate-pulse">
                    点击 ✓/× 切换 · 双击表头/字段编辑
                  </span>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs border-collapse min-w-[800px]">
                  {/* 分组表头 */}
                  <thead>
                    <tr className="bg-gray-50">
                      <th rowSpan={2} className="px-3 py-2.5 text-left font-bold text-gray-700 border-b border-r border-gray-200 sticky left-0 bg-gray-50 z-10 min-w-[100px]">
                        论文
                      </th>
                      <th rowSpan={2} className="px-3 py-2.5 text-center font-bold text-gray-700 border-b border-r border-gray-200 w-14">
                        年份
                      </th>
                      <th colSpan={3} className="px-3 py-2 text-center font-bold text-gray-700 border-b border-r border-gray-200 bg-blue-50/50">
                        {editMode && editingNode === 'header-arch' ? (
                          <input
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => {
                              setTableHeaders(prev => ({ ...prev, groups: { ...prev.groups, arch: editingText } }));
                              setEditingNode(null);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary"
                          />
                        ) : (
                          <span
                            className={editMode ? 'cursor-text hover:bg-blue-100/50 px-2 py-1 rounded transition-colors' : ''}
                            onDoubleClick={() => editMode && startEditNode('header-arch', tableHeaders.groups.arch)}
                          >
                            {tableHeaders.groups.arch}
                          </span>
                        )}
                      </th>
                      <th colSpan={3} className="px-3 py-2 text-center font-bold text-gray-700 border-b border-r border-gray-200 bg-green-50/50">
                        {editMode && editingNode === 'header-train' ? (
                          <input
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => {
                              setTableHeaders(prev => ({ ...prev, groups: { ...prev.groups, train: editingText } }));
                              setEditingNode(null);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary"
                          />
                        ) : (
                          <span
                            className={editMode ? 'cursor-text hover:bg-green-100/50 px-2 py-1 rounded transition-colors' : ''}
                            onDoubleClick={() => editMode && startEditNode('header-train', tableHeaders.groups.train)}
                          >
                            {tableHeaders.groups.train}
                          </span>
                        )}
                      </th>
                      <th colSpan={3} className="px-3 py-2 text-center font-bold text-gray-700 border-b border-r border-gray-200 bg-purple-50/50">
                        {editMode && editingNode === 'header-ability' ? (
                          <input
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => {
                              setTableHeaders(prev => ({ ...prev, groups: { ...prev.groups, ability: editingText } }));
                              setEditingNode(null);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary"
                          />
                        ) : (
                          <span
                            className={editMode ? 'cursor-text hover:bg-purple-100/50 px-2 py-1 rounded transition-colors' : ''}
                            onDoubleClick={() => editMode && startEditNode('header-ability', tableHeaders.groups.ability)}
                          >
                            {tableHeaders.groups.ability}
                          </span>
                        )}
                      </th>
                      <th colSpan={2} className="px-3 py-2 text-center font-bold text-gray-700 border-b border-gray-200 bg-amber-50/50">
                        {editMode && editingNode === 'header-feature' ? (
                          <input
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => {
                              setTableHeaders(prev => ({ ...prev, groups: { ...prev.groups, feature: editingText } }));
                              setEditingNode(null);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary"
                          />
                        ) : (
                          <span
                            className={editMode ? 'cursor-text hover:bg-amber-100/50 px-2 py-1 rounded transition-colors' : ''}
                            onDoubleClick={() => editMode && startEditNode('header-feature', tableHeaders.groups.feature)}
                          >
                            {tableHeaders.groups.feature}
                          </span>
                        )}
                      </th>
                    </tr>
                    <tr className="bg-gray-50/80 text-gray-500 font-medium">
                      {/* 模型架构 */}
                      <th className="px-2 py-2 text-center border-b border-r border-gray-200 bg-blue-50/30 whitespace-nowrap">
                        {editMode && editingNode === 'field-encoderOnly' ? (
                          <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => { setTableHeaders(prev => ({ ...prev, fields: { ...prev.fields, encoderOnly: editingText } })); setEditingNode(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary text-xs" />
                        ) : (
                          <span className={editMode ? 'cursor-text hover:bg-blue-100 px-1 rounded' : ''} onDoubleClick={() => editMode && startEditNode('field-encoderOnly', tableHeaders.fields.encoderOnly)}>{tableHeaders.fields.encoderOnly}</span>
                        )}
                      </th>
                      <th className="px-2 py-2 text-center border-b border-r border-gray-200 bg-blue-50/30 whitespace-nowrap">
                        {editMode && editingNode === 'field-decoderOnly' ? (
                          <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => { setTableHeaders(prev => ({ ...prev, fields: { ...prev.fields, decoderOnly: editingText } })); setEditingNode(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary text-xs" />
                        ) : (
                          <span className={editMode ? 'cursor-text hover:bg-blue-100 px-1 rounded' : ''} onDoubleClick={() => editMode && startEditNode('field-decoderOnly', tableHeaders.fields.decoderOnly)}>{tableHeaders.fields.decoderOnly}</span>
                        )}
                      </th>
                      <th className="px-2 py-2 text-center border-b border-r border-gray-200 bg-blue-50/30 whitespace-nowrap">
                        {editMode && editingNode === 'field-encoderDecoder' ? (
                          <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => { setTableHeaders(prev => ({ ...prev, fields: { ...prev.fields, encoderDecoder: editingText } })); setEditingNode(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary text-xs" />
                        ) : (
                          <span className={editMode ? 'cursor-text hover:bg-blue-100 px-1 rounded' : ''} onDoubleClick={() => editMode && startEditNode('field-encoderDecoder', tableHeaders.fields.encoderDecoder)}>{tableHeaders.fields.encoderDecoder}</span>
                        )}
                      </th>
                      {/* 训练范式 */}
                      <th className="px-2 py-2 text-center border-b border-r border-gray-200 bg-green-50/30 whitespace-nowrap">
                        {editMode && editingNode === 'field-pretraining' ? (
                          <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => { setTableHeaders(prev => ({ ...prev, fields: { ...prev.fields, pretraining: editingText } })); setEditingNode(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary text-xs" />
                        ) : (
                          <span className={editMode ? 'cursor-text hover:bg-green-100 px-1 rounded' : ''} onDoubleClick={() => editMode && startEditNode('field-pretraining', tableHeaders.fields.pretraining)}>{tableHeaders.fields.pretraining}</span>
                        )}
                      </th>
                      <th className="px-2 py-2 text-center border-b border-r border-gray-200 bg-green-50/30 whitespace-nowrap">
                        {editMode && editingNode === 'field-instructTuning' ? (
                          <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => { setTableHeaders(prev => ({ ...prev, fields: { ...prev.fields, instructTuning: editingText } })); setEditingNode(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary text-xs" />
                        ) : (
                          <span className={editMode ? 'cursor-text hover:bg-green-100 px-1 rounded' : ''} onDoubleClick={() => editMode && startEditNode('field-instructTuning', tableHeaders.fields.instructTuning)}>{tableHeaders.fields.instructTuning}</span>
                        )}
                      </th>
                      <th className="px-2 py-2 text-center border-b border-r border-gray-200 bg-green-50/30 whitespace-nowrap">
                        {editMode && editingNode === 'field-rlhf' ? (
                          <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => { setTableHeaders(prev => ({ ...prev, fields: { ...prev.fields, rlhf: editingText } })); setEditingNode(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary text-xs" />
                        ) : (
                          <span className={editMode ? 'cursor-text hover:bg-green-100 px-1 rounded' : ''} onDoubleClick={() => editMode && startEditNode('field-rlhf', tableHeaders.fields.rlhf)}>{tableHeaders.fields.rlhf}</span>
                        )}
                      </th>
                      {/* 能力维度 */}
                      <th className="px-2 py-2 text-center border-b border-r border-gray-200 bg-purple-50/30 whitespace-nowrap">
                        {editMode && editingNode === 'field-reasoning' ? (
                          <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => { setTableHeaders(prev => ({ ...prev, fields: { ...prev.fields, reasoning: editingText } })); setEditingNode(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary text-xs" />
                        ) : (
                          <span className={editMode ? 'cursor-text hover:bg-purple-100 px-1 rounded' : ''} onDoubleClick={() => editMode && startEditNode('field-reasoning', tableHeaders.fields.reasoning)}>{tableHeaders.fields.reasoning}</span>
                        )}
                      </th>
                      <th className="px-2 py-2 text-center border-b border-r border-gray-200 bg-purple-50/30 whitespace-nowrap">
                        {editMode && editingNode === 'field-codeGen' ? (
                          <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => { setTableHeaders(prev => ({ ...prev, fields: { ...prev.fields, codeGen: editingText } })); setEditingNode(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary text-xs" />
                        ) : (
                          <span className={editMode ? 'cursor-text hover:bg-purple-100 px-1 rounded' : ''} onDoubleClick={() => editMode && startEditNode('field-codeGen', tableHeaders.fields.codeGen)}>{tableHeaders.fields.codeGen}</span>
                        )}
                      </th>
                      <th className="px-2 py-2 text-center border-b border-r border-gray-200 bg-purple-50/30 whitespace-nowrap">
                        {editMode && editingNode === 'field-multimodal' ? (
                          <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => { setTableHeaders(prev => ({ ...prev, fields: { ...prev.fields, multimodal: editingText } })); setEditingNode(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary text-xs" />
                        ) : (
                          <span className={editMode ? 'cursor-text hover:bg-purple-100 px-1 rounded' : ''} onDoubleClick={() => editMode && startEditNode('field-multimodal', tableHeaders.fields.multimodal)}>{tableHeaders.fields.multimodal}</span>
                        )}
                      </th>
                      {/* 特性 */}
                      <th className="px-2 py-2 text-center border-b border-r border-gray-200 bg-amber-50/30 whitespace-nowrap">
                        {editMode && editingNode === 'field-openSource' ? (
                          <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => { setTableHeaders(prev => ({ ...prev, fields: { ...prev.fields, openSource: editingText } })); setEditingNode(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary text-xs" />
                        ) : (
                          <span className={editMode ? 'cursor-text hover:bg-amber-100 px-1 rounded' : ''} onDoubleClick={() => editMode && startEditNode('field-openSource', tableHeaders.fields.openSource)}>{tableHeaders.fields.openSource}</span>
                        )}
                      </th>
                      <th className="px-2 py-2 text-center border-b border-gray-200 bg-amber-50/30 whitespace-nowrap">
                        {editMode && editingNode === 'field-chineseOpt' ? (
                          <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => { setTableHeaders(prev => ({ ...prev, fields: { ...prev.fields, chineseOpt: editingText } })); setEditingNode(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-transparent text-center outline-none border-b border-primary text-xs" />
                        ) : (
                          <span className={editMode ? 'cursor-text hover:bg-amber-100 px-1 rounded' : ''} onDoubleClick={() => editMode && startEditNode('field-chineseOpt', tableHeaders.fields.chineseOpt)}>{tableHeaders.fields.chineseOpt}</span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedComparison.map((row, idx) => (
                      <tr
                        key={row.paperId}
                        onMouseEnter={() => setHoveredRow(row.paperId)}
                        onMouseLeave={() => setHoveredRow(null)}
                        className={`transition-colors ${
                          hoveredRow === row.paperId ? 'bg-primary/5' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-3 py-2.5 font-semibold text-gray-800 border-r border-b border-gray-100 sticky left-0 bg-inherit z-10">
                          {row.shortName}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 border-r border-b border-gray-100">
                          {row.year}
                        </td>
                        <td className="px-2 py-2.5 text-center border-r border-b border-gray-100"><Mark value={row.encoderOnly} paperId={row.paperId} field="encoderOnly" /></td>
                        <td className="px-2 py-2.5 text-center border-r border-b border-gray-100"><Mark value={row.decoderOnly} paperId={row.paperId} field="decoderOnly" /></td>
                        <td className="px-2 py-2.5 text-center border-r border-b border-gray-100"><Mark value={row.encoderDecoder} paperId={row.paperId} field="encoderDecoder" /></td>
                        <td className="px-2 py-2.5 text-center border-r border-b border-gray-100"><Mark value={row.pretraining} paperId={row.paperId} field="pretraining" /></td>
                        <td className="px-2 py-2.5 text-center border-r border-b border-gray-100"><Mark value={row.instructTuning} paperId={row.paperId} field="instructTuning" /></td>
                        <td className="px-2 py-2.5 text-center border-r border-b border-gray-100"><Mark value={row.rlhf} paperId={row.paperId} field="rlhf" /></td>
                        <td className="px-2 py-2.5 text-center border-r border-b border-gray-100"><Mark value={row.reasoning} paperId={row.paperId} field="reasoning" /></td>
                        <td className="px-2 py-2.5 text-center border-r border-b border-gray-100"><Mark value={row.codeGen} paperId={row.paperId} field="codeGen" /></td>
                        <td className="px-2 py-2.5 text-center border-r border-b border-gray-100"><Mark value={row.multimodal} paperId={row.paperId} field="multimodal" /></td>
                        <td className="px-2 py-2.5 text-center border-r border-b border-gray-100"><Mark value={row.openSource} paperId={row.paperId} field="openSource" /></td>
                        <td className="px-2 py-2.5 text-center border-b border-gray-100"><Mark value={row.chineseOpt} paperId={row.paperId} field="chineseOpt" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 表格底部说明 */}
              <div className="mt-3 flex items-start gap-1.5 text-[10px] text-gray-400">
                <InfoCircleOutlined style={{ fontSize: '10px', marginTop: '2px' }} />
                <span>
                  <CheckCircleFilled style={{ fontSize: '9px', color: '#1a5c3a', margin: '0 2px' }} /> 表示该论文具备此特性，
                  <CloseOutlined style={{ fontSize: '8px', color: '#d1d5db', margin: '0 2px' }} /> 表示不涉及。
                </span>
              </div>
            </div>
          ) : activeTab === 'mindmap' ? (
            /* ═══ 文献思维导图 ═══ */
            <div className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-800">文献关系思维导图</h3>
                {editMode && (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full font-medium animate-pulse">
                    双击编辑 · 点 + 添加 · 点 × 删除
                  </span>
                )}
              </div>
              <div className="overflow-x-auto pb-4">
                <div className="inline-flex items-start min-w-max">
                  <MindMapBranch
                    node={mindMapData}
                    isRoot
                    editMode={editMode}
                    editingNode={editingNode}
                    editingText={editingText}
                    onStartEdit={startEditNode}
                    onChangeText={setEditingText}
                    onCommitEdit={() => {
                      if (editingNode) {
                        setMindMapData(prev => updateMindMapNode(prev, editingNode, editingText));
                        setEditingNode(null);
                      }
                    }}
                    onAddChild={addMindMapChild}
                    onDelete={deleteMindMapNode}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ═══ 研究脉络图 ═══ */
            <div className="p-5">
              <div className="mb-5 flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-800">大语言模型研究演进脉络</h3>
                <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                  {selectedRoadmap.reduce((sum, era) => sum + era.papers.length, 0)} 篇文献
                </span>
                {editMode && (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full font-medium animate-pulse">
                    双击标题/论文名/标签编辑
                  </span>
                )}
              </div>

              {/* 垂直时间线 */}
              <div className="relative pl-8">
                {/* 时间线主轴 */}
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-300 via-primary to-amber-300 rounded-full" />

                {selectedRoadmap.map((era, eraIdx) => (
                  <div key={era.year} className={`relative ${eraIdx > 0 ? 'mt-8' : ''}`}>
                    {/* 时间节点圆点 */}
                    <div
                      className="absolute -left-[17.5px] top-1 w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md z-10"
                      style={{ background: era.color }}
                    >
                      {era.year.slice(-2)}
                    </div>

                    {/* 时代标题 */}
                    <div className="ml-6 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-800">{era.year}</span>
                        {editMode && editingNode === `era-${era.year}` ? (
                          <input
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => {
                              setRoadmapData(prev => prev.map(e => e.year === era.year ? { ...e, title: editingText } : e));
                              setEditingNode(null);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="text-[11px] font-semibold text-gray-600 bg-white border border-primary/30 rounded px-1.5 py-0.5 outline-none focus:border-primary"
                          />
                        ) : (
                          <span
                            className={`text-[11px] font-semibold text-gray-600 ${editMode ? 'cursor-text hover:bg-amber-50 px-1 rounded transition-colors' : ''}`}
                            onDoubleClick={() => startEditNode(`era-${era.year}`, era.title)}
                          >
                            {era.title}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 论文卡片 */}
                    <div className="ml-6 flex flex-wrap gap-3">
                      {era.papers.map((paper) => {
                        const fullPaper = MOCK_PAPERS.find((p) => p.id === paper.id);
                        return (
                          <div
                            key={paper.id}
                            className="group relative bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 p-4 w-[280px]"
                          >
                            {/* 顶部色带 */}
                            <div
                              className="absolute top-0 left-4 right-4 h-0.5 rounded-b-full"
                              style={{ background: era.color }}
                            />

                            <div className="flex items-start gap-2.5">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                                style={{ background: era.color }}
                              >
                                {paper.name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                {editMode && editingNode === `paper-${paper.id}-name` ? (
                                  <input
                                    autoFocus
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    onBlur={() => {
                                      setRoadmapData(prev => prev.map(e => e.year === era.year ? {
                                        ...e,
                                        papers: e.papers.map(p => p.id === paper.id ? { ...p, name: editingText } : p)
                                      } : e));
                                      setEditingNode(null);
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                    className="w-full text-xs font-bold text-gray-800 bg-white border border-primary/30 rounded px-1.5 py-0.5 outline-none focus:border-primary"
                                  />
                                ) : (
                                  <h4
                                    className={`text-xs font-bold text-gray-800 group-hover:text-primary transition-colors ${editMode ? 'cursor-text hover:bg-amber-50 px-1 rounded' : ''}`}
                                    onDoubleClick={() => editMode && startEditNode(`paper-${paper.id}-name`, paper.name)}
                                  >
                                    {paper.name}
                                  </h4>
                                )}
                                {editMode && editingNode === `paper-${paper.id}-tag` ? (
                                  <input
                                    autoFocus
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    onBlur={() => {
                                      setRoadmapData(prev => prev.map(e => e.year === era.year ? {
                                        ...e,
                                        papers: e.papers.map(p => p.id === paper.id ? { ...p, tag: editingText } : p)
                                      } : e));
                                      setEditingNode(null);
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                    className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-white border border-primary/30 outline-none focus:border-primary"
                                    style={{ color: era.color }}
                                  />
                                ) : (
                                  <span
                                    className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${editMode ? 'cursor-text hover:opacity-80' : ''}`}
                                    style={{
                                      background: `${era.color}15`,
                                      color: era.color,
                                    }}
                                    onDoubleClick={() => editMode && startEditNode(`paper-${paper.id}-tag`, paper.tag)}
                                  >
                                    {paper.tag}
                                  </span>
                                )}
                              </div>
                            </div>

                            {fullPaper && (
                              editMode && editingNode === `paper-${paper.id}-abstract` ? (
                                <textarea
                                  autoFocus
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  onBlur={() => {
                                    setRoadmapData(prev => prev.map(e => e.year === era.year ? {
                                      ...e,
                                      papers: e.papers.map(p => p.id === paper.id ? { ...p, abstract: editingText } : p)
                                    } : e));
                                    setEditingNode(null);
                                  }}
                                  rows={3}
                                  className="mt-2.5 w-full text-[11px] text-gray-500 leading-relaxed bg-white border border-primary/30 rounded px-2 py-1 outline-none focus:border-primary resize-none"
                                />
                              ) : (
                                <p 
                                  className={`mt-2.5 text-[11px] text-gray-500 leading-relaxed line-clamp-3 ${editMode ? 'cursor-text hover:bg-amber-50 px-2 py-1 rounded transition-colors' : ''}`}
                                  onDoubleClick={() => editMode && startEditNode(`paper-${paper.id}-abstract`, paper.abstract || fullPaper.abstract)}
                                >
                                  {paper.abstract || fullPaper.abstract}
                                </p>
                              )
                            )}

                            {/* 连线指示器 */}
                            {eraIdx < selectedRoadmap.length - 1 && (
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: era.color, opacity: 0.4 }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 演进箭头说明 */}
                    {eraIdx < selectedRoadmap.length - 1 && (
                      <div className="ml-6 mt-3 flex items-center gap-2 text-[10px] text-gray-300">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-gray-400 whitespace-nowrap">
                          {era.title.includes('架构') ? '架构奠基 →' :
                           era.title.includes('预训练') ? '预训练发展 →' :
                           era.title.includes('规模') ? '规模扩展 →' :
                           era.title.includes('微调') ? '高效适配 →' :
                           era.title.includes('对齐') ? '安全对齐 →' : '持续演进 →'}
                        </span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                    )}
                  </div>
                ))}

                {/* 未来展望 */}
                <div className="relative mt-8">
                  <div className="absolute -left-[17.5px] top-1 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-[10px] font-bold shadow-sm z-10">
                    ?
                  </div>
                  <div className="ml-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-400">未来</span>
                      <span className="text-[11px] text-gray-400">研究展望</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['AGI 通用智能', '具身智能', '自主 Agent', '科学发现'].map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 text-[10px] text-gray-400 border border-dashed border-gray-200 rounded-lg"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   思维导图递归分支
   ═══════════════════════════════════════════════════════ */

function MindMapBranch({
  node,
  isRoot = false,
  editMode,
  editingNode,
  editingText,
  onStartEdit,
  onChangeText,
  onCommitEdit,
  onAddChild,
  onDelete,
}: {
  node: MindMapNode;
  isRoot?: boolean;
  editMode: boolean;
  editingNode: string | null;
  editingText: string;
  onStartEdit: (id: string, text: string) => void;
  onChangeText: (text: string) => void;
  onCommitEdit: () => void;
  onAddChild: (parentId: string) => void;
  onDelete: (nodeId: string) => void;
}) {
  const color = node.color || '#6b7280';
  const isEditing = editingNode === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex items-center">
      {/* 节点卡片 */}
      <div className="relative group shrink-0">
        <div
          className={`relative rounded-xl border-2 transition-all duration-150 ${
            isRoot
              ? 'px-5 py-3.5 min-w-[160px] shadow-md'
              : 'px-3 py-2 min-w-[120px]'
          } ${isEditing ? 'border-primary shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}
          style={{ borderLeftColor: color, borderLeftWidth: '3px', background: isRoot ? `${color}08` : '#fff' }}
          onDoubleClick={() => onStartEdit(node.id, node.label)}
        >
          {isEditing ? (
            <textarea
              autoFocus
              value={editingText}
              onChange={(e) => onChangeText(e.target.value)}
              onBlur={onCommitEdit}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onCommitEdit(); } }}
              className="w-full bg-transparent text-xs text-gray-800 outline-none resize-none leading-relaxed min-w-[100px]"
              rows={editingText.split('\n').length}
            />
          ) : (
            <div className={`whitespace-pre-wrap leading-relaxed ${isRoot ? 'text-sm font-bold' : 'text-[11px]'} text-gray-800`}>
              {node.label.split('\n').map((line, i) => (
                <div key={i} className={i === 0 ? (isRoot ? 'font-bold' : 'font-semibold') : 'text-gray-500 text-[10px]'}>
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 编辑模式操作按钮 */}
        {editMode && !isRoot && (
          <button
            onClick={() => onDelete(node.id)}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-400 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
          >
            <CloseOutlined style={{ fontSize: '7px' }} />
          </button>
        )}
        {editMode && (
          <button
            onClick={() => onAddChild(node.id)}
            className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/80 z-10"
          >
            <PlusOutlined style={{ fontSize: '7px' }} />
          </button>
        )}
      </div>

      {/* 子节点 */}
      {hasChildren && (
        <div className="flex items-center ml-0">
          {/* 父到分叉点水平线 */}
          <svg width="28" height="2" className="shrink-0" style={{ overflow: 'visible' }}>
            <line x1="0" y1="1" x2="28" y2="1" stroke={color} strokeWidth="1.5" strokeOpacity="0.3" />
          </svg>

          {/* 子节点列 + 垂直连线 */}
          <div className="flex flex-col">
            {node.children.map((child, i) => (
              <div key={child.id} className="flex items-stretch">
                {/* 连线片段 */}
                <div className="flex flex-col items-center w-4 shrink-0">
                  <div className={`w-px flex-1 ${i === 0 ? '' : ''}`} style={i > 0 ? { background: `${color}40` } : {}} />
                  <div className="w-full h-px shrink-0" style={{ background: `${color}40` }} />
                  <div className={`w-px flex-1`} style={i < node.children.length - 1 ? { background: `${color}40` } : {}} />
                </div>

                {/* 递归 */}
                <div className="py-1.5">
                  <MindMapBranch
                    node={child}
                    editMode={editMode}
                    editingNode={editingNode}
                    editingText={editingText}
                    onStartEdit={onStartEdit}
                    onChangeText={onChangeText}
                    onCommitEdit={onCommitEdit}
                    onAddChild={onAddChild}
                    onDelete={onDelete}
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
