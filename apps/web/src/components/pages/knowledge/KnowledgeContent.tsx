'use client';
import { 
  UploadOutlined, 
  FileTextOutlined, 
  SearchOutlined, 
  EyeOutlined, 
  DeleteOutlined, 
  InboxOutlined, 
  ApartmentOutlined, 
  DatabaseOutlined, 
  FileSearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  ThunderboltOutlined
} from '@ant-design/icons';
import { BaseUploader } from '@/components/pages/common/BaseUploader';
import { NoteUploadModal } from '@/components/pages/knowledge/NoteUploadModal';
import { KnowledgeCardModal, KnowledgeCardData } from '@/components/pages/knowledge/KnowledgeCardModal';
import { useState } from 'react';
import { Tag, App, Button, Tooltip } from 'antd';


interface KnowledgeContentProps {
  activeItem: string;
  onItemSelect?: (item: string) => void;
}

// 模拟文献数据
const mockDocuments = [
  { id: 1, name: '深度学习研究综述.pdf', type: 'pdf', size: '2.3 MB', date: '2024-01-15', tags: ['深度学习', 'AI'], status: '已解析' },
  { id: 2, name: '强化学习算法优化.pdf', type: 'pdf', size: '1.8 MB', date: '2024-01-12', tags: ['强化学习'], status: '已解析' },
  { id: 3, name: '自然语言处理论文.pdf', type: 'pdf', size: '3.5 MB', date: '2024-01-10', tags: ['NLP', '大模型'], status: '解析中' },
];

// 模拟标签数据
const mockTags = [
  { id: 1, name: '深度学习', count: 15, color: 'bg-blue-100 text-blue-600' },
  { id: 2, name: '强化学习', count: 8, color: 'bg-green-100 text-green-600' },
  { id: 3, name: 'NLP', count: 12, color: 'bg-purple-100 text-purple-600' },
  { id: 4, name: '大模型', count: 20, color: 'bg-orange-100 text-orange-600' },
  { id: 5, name: '知识图谱', count: 6, color: 'bg-pink-100 text-pink-600' },
];

const buildCardSections = (data: {
  content: string;
  innovationPoints: string;
  methodology: string;
  experimentProcess: string;
  algorithmFlow: string;
  methodComparison: string;
  keyResults: string;
  theoreticalFramework: string;
  datasetAndMetrics: string;
  limitations: string;
  futureWork: string;
}) => [
  { id: 'researchBackground', title: '研究背景与问题定义', content: data.content, removable: false },
  { id: 'innovationPoints', title: '创新点', content: data.innovationPoints, removable: false },
  { id: 'methodology', title: '研究方法', content: data.methodology, removable: false },
  { id: 'experimentProcess', title: '实验流程', content: data.experimentProcess, removable: false },
  { id: 'algorithmFlow', title: '算法流程', content: data.algorithmFlow, removable: false },
  { id: 'methodComparison', title: '方法对比（与现有方法相比的优劣）', content: data.methodComparison, removable: false },
  { id: 'datasetAndMetrics', title: '数据集与评估指标', content: data.datasetAndMetrics, removable: false },
  { id: 'keyResults', title: '关键结果', content: data.keyResults, removable: false },
  { id: 'theoreticalFramework', title: '理论框架', content: data.theoreticalFramework, removable: false },
  { id: 'limitations', title: '局限性与风险', content: data.limitations, removable: false },
  { id: 'futureWork', title: '未来工作与应用价值', content: data.futureWork, removable: false }
];

// 模拟知识卡片数据 (扩展)
const initialMockCards: KnowledgeCardData[] = [
  { 
    id: 1, 
    title: 'Transformer架构', 
    content: '基于自注意力机制的神经网络架构...', 
    source: '深度学习研究综述.pdf', 
    date: '2024-01-15',
    innovationPoints: '提出了自注意力机制，解决了长距离依赖问题。引入了多头注意力机制，允许模型在不同的位置关注不同的子空间信息。',
    methodology: '文献研究法，对比实验。在WMT 2014英德和英法翻译任务上进行评估。',
    experimentProcess: '使用WMT 2014英德数据集（4.5M句对）和英法数据集（36M句对）。模型训练使用8个P100 GPU，基础模型训练12小时，大模型训练3.5天。使用Adam优化器。',
    algorithmFlow: '1) 将输入序列映射为词向量并加入位置编码；2) 通过多头自注意力计算全局依赖；3) 经过前馈网络进行非线性变换；4) 在编码器-解码器注意力中融合源序列信息；5) 通过线性层与Softmax逐步生成目标序列。',
    methodComparison: '相比RNN/CNN序列模型，Transformer并行性更强、长程依赖建模更优；缺点是在超长序列下注意力计算复杂度更高。',
    keyResults: '在英德翻译任务上达到28.4 BLEU，比现有最佳结果提升2.0 BLEU。在英法任务上达到41.8 BLEU。训练成本仅为之前最佳模型的一小部分。',
    theoreticalFramework: '基于Attention Is All You Need，完全抛弃了递归和卷积，仅依赖注意力机制。',
    tags: ['深度学习', 'NLP', 'Transformer'],
    sections: buildCardSections({
      content: '基于自注意力机制的神经网络架构，面向机器翻译任务重构序列建模方式。',
      innovationPoints: '提出了自注意力机制，解决了长距离依赖问题。引入了多头注意力机制，允许模型在不同的位置关注不同的子空间信息。',
      methodology: '文献研究法，对比实验。在WMT 2014英德和英法翻译任务上进行评估。',
      experimentProcess: '使用WMT 2014英德数据集（4.5M句对）和英法数据集（36M句对）。模型训练使用8个P100 GPU，基础模型训练12小时，大模型训练3.5天。使用Adam优化器。',
      algorithmFlow: '1) 将输入序列映射为词向量并加入位置编码；2) 通过多头自注意力计算全局依赖；3) 经过前馈网络进行非线性变换；4) 在编码器-解码器注意力中融合源序列信息；5) 通过线性层与Softmax逐步生成目标序列。',
      methodComparison: '相比RNN/CNN序列模型，Transformer并行性更强、长程依赖建模更优；缺点是在超长序列下注意力计算复杂度更高。',
      datasetAndMetrics: '数据集：WMT14 En-De、WMT14 En-Fr；评估指标：BLEU、训练速度、并行吞吐。',
      keyResults: '在英德翻译任务上达到28.4 BLEU，比现有最佳结果提升2.0 BLEU。在英法任务上达到41.8 BLEU。训练成本仅为之前最佳模型的一小部分。',
      theoreticalFramework: '基于Attention Is All You Need，完全抛弃了递归和卷积，仅依赖注意力机制。',
      limitations: '对超长序列仍存在显存和复杂度压力，位置编码对跨域泛化有一定限制。',
      futureWork: '可结合稀疏注意力、线性注意力和检索增强机制，降低长文本任务成本并提升跨任务迁移效果。'
    })
  },
  { 
    id: 2, 
    title: 'RAG技术原理', 
    content: '检索增强生成技术结合了检索和生成...', 
    source: '自然语言处理论文.pdf', 
    date: '2024-01-10',
    innovationPoints: '结合了非参数记忆（检索索引）和参数记忆（生成模型）。提出了一种端到端的微调方法。',
    methodology: '实验验证，消融实验。对比了纯生成模型（如BART）和RAG模型在不同任务上的表现。',
    experimentProcess: '构建维基百科的稠密向量索引（DPR）。使用预训练的BART作为生成器。在Natural Questions, WebQuestions, CuratedTrec等数据集上进行测试。',
    algorithmFlow: '1) 对用户问题进行编码；2) 在向量索引中检索Top-K相关文档；3) 将问题与检索片段拼接输入生成模型；4) 生成答案并在解码阶段动态利用检索证据；5) 输出带知识支撑的最终回答。',
    methodComparison: '相比纯生成模型，RAG在事实一致性和可追溯性更好；缺点是依赖检索质量，系统链路更复杂。',
    keyResults: '在开放域问答任务上表现优异，准确率显著高于纯生成模型。生成的答案更具事实性，幻觉现象减少。',
    theoreticalFramework: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks。',
    tags: ['RAG', 'LLM', '知识增强'],
    sections: buildCardSections({
      content: '检索增强生成技术结合了检索和生成，提升知识密集型任务准确率。',
      innovationPoints: '结合了非参数记忆（检索索引）和参数记忆（生成模型）。提出了一种端到端的微调方法。',
      methodology: '实验验证，消融实验。对比了纯生成模型（如BART）和RAG模型在不同任务上的表现。',
      experimentProcess: '构建维基百科的稠密向量索引（DPR）。使用预训练的BART作为生成器。在Natural Questions, WebQuestions, CuratedTrec等数据集上进行测试。',
      algorithmFlow: '1) 对用户问题进行编码；2) 在向量索引中检索Top-K相关文档；3) 将问题与检索片段拼接输入生成模型；4) 生成答案并在解码阶段动态利用检索证据；5) 输出带知识支撑的最终回答。',
      methodComparison: '相比纯生成模型，RAG在事实一致性和可追溯性更好；缺点是依赖检索质量，系统链路更复杂。',
      datasetAndMetrics: '数据集：NQ、WebQuestions、CuratedTrec；指标：EM、F1、证据可追溯性。',
      keyResults: '在开放域问答任务上表现优异，准确率显著高于纯生成模型。生成的答案更具事实性，幻觉现象减少。',
      theoreticalFramework: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks。',
      limitations: '检索质量直接决定上限，索引更新与在线延迟控制成本较高。',
      futureWork: '引入多跳检索、重排序与缓存策略，提升复杂问题场景下的稳定性与响应速度。'
    })
  },
];

export default function KnowledgeContent({ activeItem, onItemSelect }: KnowledgeContentProps) {
  const { message } = App.useApp();

  // 状态管理
  const [cards, setCards] = useState<KnowledgeCardData[]>(initialMockCards);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [currentCard, setCurrentCard] = useState<KnowledgeCardData | null>(null);

  // 处理卡片保存
  const handleSaveCard = (card: KnowledgeCardData) => {
    if (cards.some(c => c.id === card.id)) {
      setCards(cards.map(c => c.id === card.id ? card : c));
    } else {
      setCards([card, ...cards]);
    }
  };

  // 处理打开编辑/新建
  const openCardModal = (card: KnowledgeCardData | null = null) => {
    setCurrentCard(card);
    setIsCardModalOpen(true);
  };

  // AI 生成卡片逻辑
  const handleGenerateCard = (docName: string) => {
    const loadingKey = 'generating-card';
    message.loading({ content: 'AI 正在深入分析论文，提取创新点与实验数据...', key: loadingKey, duration: 0 });
    
    setTimeout(() => {
      const newCard: KnowledgeCardData = {
        id: Date.now(),
        title: docName.replace('.pdf', ''),
        source: docName,
        date: new Date().toISOString().split('T')[0],
        innovationPoints: '【AI 提取】\n1. 提出了一种新颖的动态图神经网络架构，能够自适应地学习节点间的关系。\n2. 解决了传统方法在处理非欧几里得数据时的效率瓶颈，通过引入稀疏注意力机制。',
        methodology: '【AI 提取】\n采用对比学习范式，结合图注意力机制（GAT）。在三个基准数据集（Cora, Citeseer, Pubmed）上进行了广泛的消融实验。',
        experimentProcess: '【AI 提取】\n1. 数据预处理：使用TF-IDF提取节点特征，进行归一化处理。\n2. 模型训练：使用Adam优化器，学习率0.001，Dropout设置为0.5，训练200个Epoch。\n3. 评估指标：Accuracy, F1-score。',
        algorithmFlow: '【AI 提取】\n1. 输入图结构与节点特征；\n2. 通过动态图关系模块更新邻接关系；\n3. 使用稀疏注意力聚合邻域信息；\n4. 经过多层图神经网络编码得到节点表示；\n5. 输出下游任务预测结果并反向优化参数。',
        methodComparison: '【AI 提取】\n相比GCN/GAT在静态邻接关系下的表示方式，该方法在动态关系建模与标签稀疏场景有更高精度；代价是训练复杂度更高。',
        keyResults: '【AI 提取】\n实验结果表明，该方法在节点分类任务上比SOTA模型（如GCN, GAT）提升了2.5%。特别是在标签稀疏的情况下，性能提升更为显著。',
        theoreticalFramework: '【AI 提取】\n基于图信号处理理论和深度学习表示学习框架。结合了互信息最大化原理。',
        tags: ['AI生成', '图神经网络', '深度学习'],
        content: 'AI 自动生成的论文摘要：本文提出了一种新的图神经网络架构，旨在解决...',
        sections: buildCardSections({
          content: 'AI 自动生成的论文摘要：本文提出了一种新的图神经网络架构，旨在解决复杂关系建模中的泛化不足问题。',
          innovationPoints: '【AI 提取】\n1. 提出了一种新颖的动态图神经网络架构，能够自适应地学习节点间的关系。\n2. 解决了传统方法在处理非欧几里得数据时的效率瓶颈，通过引入稀疏注意力机制。',
          methodology: '【AI 提取】\n采用对比学习范式，结合图注意力机制（GAT）。在三个基准数据集（Cora, Citeseer, Pubmed）上进行了广泛的消融实验。',
          experimentProcess: '【AI 提取】\n1. 数据预处理：使用TF-IDF提取节点特征，进行归一化处理。\n2. 模型训练：使用Adam优化器，学习率0.001，Dropout设置为0.5，训练200个Epoch。\n3. 评估指标：Accuracy, F1-score。',
          algorithmFlow: '【AI 提取】\n1. 输入图结构与节点特征；\n2. 通过动态图关系模块更新邻接关系；\n3. 使用稀疏注意力聚合邻域信息；\n4. 经过多层图神经网络编码得到节点表示；\n5. 输出下游任务预测结果并反向优化参数。',
          methodComparison: '【AI 提取】\n相比GCN/GAT在静态邻接关系下的表示方式，该方法在动态关系建模与标签稀疏场景有更高精度；代价是训练复杂度更高。',
          datasetAndMetrics: '【AI 提取】\n数据集：Cora、Citeseer、Pubmed。指标：Accuracy、Macro-F1、收敛轮次。',
          keyResults: '【AI 提取】\n实验结果表明，该方法在节点分类任务上比SOTA模型（如GCN, GAT）提升了2.5%。特别是在标签稀疏的情况下，性能提升更为显著。',
          theoreticalFramework: '【AI 提取】\n基于图信号处理理论和深度学习表示学习框架。结合了互信息最大化原理。',
          limitations: '【AI 提取】\n在超大图上训练时间仍偏高，对动态图结构漂移的鲁棒性仍需增强。',
          futureWork: '【AI 提取】\n计划引入增量更新与在线蒸馏策略，提升工业场景可部署性。'
        })
      };
      
      setCards([newCard, ...cards]);
      message.success({ content: '知识卡片生成完成！', key: loadingKey });
      
      // 切换到知识卡片视图
      if (onItemSelect) {
        onItemSelect('knowledge-card');
      }
    }, 2000);
  };

  // 渲染文献列表
  const renderDocumentList = () => (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {/* 使用 BaseUploader 包裹按钮 */}
          <BaseUploader 
            accept=".pdf" 
            onSuccess={(file) => console.log("列表页上传成功:", file.name)}
          >
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm">
              <UploadOutlined />
              <span>上传PDF</span>
            </button>
          </BaseUploader>
        </div>
        <div className="relative">
          <input 
            type="text"
            placeholder="搜索文献..."
            className="w-64 h-9 pl-9 pr-4 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors"
          />
          <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      {/* 表头 */}
      <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-500">
        <div className="col-span-4">文件名</div>
        <div className="col-span-3">标签</div>
        <div className="col-span-2">状态</div>
        <div className="col-span-2">日期</div>
        <div className="col-span-1">操作</div>
      </div>
      {/* 文献列表 */}
      {mockDocuments.map((doc) => (
        <div key={doc.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-sm items-center">
          <div className="col-span-4 flex items-center gap-2">
            <FileTextOutlined className="text-red-500 text-lg" />
            <span className="text-gray-700 truncate">{doc.name}</span>
          </div>
          <div className="col-span-3 flex flex-wrap gap-1">
            {doc.tags.map((tag, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">{tag}</span>
            ))}
          </div>
          <div className="col-span-2">
            <span className={`px-2 py-0.5 text-xs rounded ${doc.status === '已解析' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
              {doc.status}
            </span>
          </div>
          <div className="col-span-2 text-gray-500">{doc.date}</div>
          <div className="col-span-1 flex items-center gap-1">
            <button className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors">
              <EyeOutlined />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
              <DeleteOutlined />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染PDF上传区域
  const renderPdfUpload = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center hover:border-primary transition-colors cursor-pointer">
        <InboxOutlined className="text-5xl text-gray-300 mb-4" />
        <p className="text-gray-600 mb-2">点击或拖拽PDF文件到此处上传</p>
        <p className="text-gray-400 text-sm">支持批量上传，单个文件最大50MB</p>
        <button className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors">
          选择文件
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-700 mb-3">上传须知</h3>
        <ul className="text-sm text-gray-500 space-y-2">
          <li>• 支持PDF格式的学术论文</li>
          <li>• 系统将自动解析论文内容，提取关键信息</li>
          <li>• 解析完成后可进行标签管理和知识卡片创建</li>
        </ul>
      </div>
    </div>
  );

  // 渲染关键词检索
  const renderKeywordSearch = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-700 mb-4">智能论文检索</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">研究关键词</label>
            <input 
              type="text"
              placeholder="输入关键词，如：深度学习、强化学习、自然语言处理..."
              className="w-full h-10 px-4 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">研究动机（可选）</label>
            <textarea 
              placeholder="描述你的研究目标和动机，系统将为你推荐最相关的SOTA论文..."
              className="w-full h-24 px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
          <button className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2">
            <SearchOutlined />
            <span>搜索论文</span>
          </button>
        </div>
      </div>
    </div>
  );

  // 渲染PDF解析
  const renderPdfParse = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-700">PDF解析队列</h3>
          <span className="text-sm text-gray-400">共 3 个文件</span>
        </div>
        {mockDocuments.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3">
              <FileSearchOutlined className="text-primary text-lg" />
              <span className="text-gray-700">{doc.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 text-xs rounded ${doc.status === '已解析' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                {doc.status}
              </span>
              {doc.status === '已解析' && (
                <Tooltip title="AI 自动生成知识卡片">
                  <Button 
                    type="link" 
                    size="small" 
                    icon={<ThunderboltOutlined />} 
                    onClick={() => handleGenerateCard(doc.name)}
                  >
                    生成卡片
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 渲染知识图谱
  const renderKnowledgeGraph = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 h-96 flex flex-col items-center justify-center">
      <ApartmentOutlined className="text-5xl text-gray-300 mb-4" />
      <p className="text-gray-500 mb-2">知识图谱可视化</p>
      <p className="text-gray-400 text-sm">上传并解析PDF后，系统将自动构建知识图谱</p>
    </div>
  );

  // 渲染向量数据库
  const renderVectorDB = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 h-96 flex flex-col items-center justify-center">
      <DatabaseOutlined className="text-5xl text-gray-300 mb-4" />
      <p className="text-gray-500 mb-2">向量数据库</p>
      <p className="text-gray-400 text-sm">文献内容将被向量化存储，支持语义检索</p>
    </div>
  );

  // 渲染标签管理
  const renderTagManage = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-700">标签管理</h3>
          <button className="flex items-center gap-1 text-sm text-primary hover:text-primary-hover">
            <PlusOutlined />
            <span>新建标签</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {mockTags.map((tag) => (
            <div key={tag.id} className={`px-4 py-2 rounded-lg ${tag.color} flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity`}>
              <span>{tag.name}</span>
              <span className="text-xs opacity-70">({tag.count})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 渲染知识卡片
  const renderKnowledgeCards = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">共 {cards.length} 张卡片</span>
        <div className="flex gap-2">
          <button 
            onClick={() => openCardModal()}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <PlusOutlined />
            <span>人工录入</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <div 
            key={card.id} 
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer relative group"
            onClick={() => openCardModal(card)}
          >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
               <EditOutlined className="text-primary" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2 pr-6">{card.title}</h3>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
              {card.innovationPoints || card.content || "暂无描述"}
            </p>
            {card.sections && card.sections.length > 0 && (
              <div className="mb-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                <span>板块数 {card.sections.length}</span>
                <span>可折叠编辑</span>
              </div>
            )}
            {card.tags && card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {card.tags.slice(0, 3).map(tag => (
                   <Tag key={tag} className="text-xs m-0" color={tag === 'AI生成' ? 'blue' : 'default'}>{tag}</Tag>
                ))}
                {card.tags.length > 3 && <Tag className="text-xs m-0">...</Tag>}
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>来源: {card.source}</span>
              <span>{card.date}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* 知识卡片编辑弹窗 */}
      <KnowledgeCardModal
        open={isCardModalOpen}
        initialData={currentCard}
        onClose={() => setIsCardModalOpen(false)}
        onSave={handleSaveCard}
      />
    </div>
  );

  // 渲染阅读笔记
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const renderReadingNotes = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="text-center py-12">
        <FileTextOutlined className="text-5xl text-gray-300 mb-4" />
        <p className="text-gray-500 mb-2">阅读笔记</p>
        <p className="text-gray-400 text-sm mb-4">记录你的阅读心得和研究想法</p>
        
        {/* 点击打开弹窗 */}
        <button 
          onClick={() => setIsNoteModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          创建笔记
        </button>
      </div>

      {/* 引入弹窗组件 */}
      <NoteUploadModal 
        open={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onNewNote={() => {
          console.log("跳转到编辑器");
          setIsNoteModalOpen(false);
        }}
        onUploadSuccess={(file) => {
          console.log("笔记文件/粘贴内容已就绪:", file);
          setIsNoteModalOpen(false);
        }}
      />
    </div>
  );

  // 根据选中项渲染内容
  const renderContent = () => {
    switch (activeItem) {
      case 'all-docs':
        return renderDocumentList();
      case 'pdf-upload':
        return renderPdfUpload();
      case 'keyword-search':
        return renderKeywordSearch();
      case 'pdf-parse':
        return renderPdfParse();
      case 'knowledge-graph':
        return renderKnowledgeGraph();
      case 'vector-db':
        return renderVectorDB();
      case 'tag-manage':
        return renderTagManage();
      case 'knowledge-card':
        return renderKnowledgeCards();
      case 'reading-notes':
        return renderReadingNotes();
      default:
        return renderDocumentList();
    }
  };

  // 获取标题
  const getTitle = () => {
    const titles: Record<string, string> = {
      'all-docs': '全部文献',
      'pdf-upload': 'PDF上传',
      'keyword-search': '关键词检索',
      'pdf-parse': 'PDF解析',
      'knowledge-graph': '知识图谱',
      'vector-db': '向量数据库',
      'tag-manage': '标签管理',
      'knowledge-card': '知识卡片',
      'reading-notes': '阅读笔记',
    };
    return titles[activeItem] || '全部文献';
  };

  return (
    <div className="flex-1 h-full overflow-auto p-6 bg-gray-50">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">{getTitle()}</h2>
      {renderContent()}
    </div>
  );
}
