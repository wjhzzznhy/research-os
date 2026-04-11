'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ClearOutlined,
  CopyOutlined,
  CheckOutlined,
  EllipsisOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'init',
    role: 'assistant',
    content:
      '你好！我是你的 LaTeX 写作助手。我可以帮你：\n\n• 修改和优化 LaTeX 代码\n• 解释复杂的数学公式\n• 提供写作建议和结构优化\n• 生成参考文献格式\n\n请告诉我你需要什么帮助？',
  },
];

const QUICK_ACTIONS = ['优化摘要', '添加公式', '修改语法', '生成引用', '解释代码'];

function getMockResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('摘要') || q.includes('abstract')) {
    return '你的摘要结构清晰。建议：\n\n1. **首句**：直接点明研究问题和挑战\n2. **方法句**：一句话概括你的核心方案 (FAR-VUS)\n3. **结果句**：加入具体数字，例如"在 CIFAR-10 上提升 38×"\n\n示例修改：\n```\nThis paper proposes FAR-VUS, a novel federated unlearning\nmethod that achieves 38× speedup over exact retraining\nwhile maintaining model accuracy within 0.3%.\n```';
  }
  if (q.includes('公式') || q.includes('formula') || q.includes('math')) {
    return '常用 LaTeX 数学公式模板：\n\n**行内公式**：`$f(x) = \\\\sum_{i=1}^{n} w_i x_i$`\n\n**独立公式**：\n```latex\n\\\\begin{equation}\n  \\\\mathcal{L}_{forget} = \\\\frac{1}{|\\\\mathcal{D}_f|}\n  \\\\sum_{(x,y) \\\\in \\\\mathcal{D}_f} \\\\ell(f_\\\\theta(x), y)\n\\\\end{equation}\n```\n\n**矩阵**：\n```latex\n\\\\begin{bmatrix} a & b \\\\\\\\ c & d \\\\end{bmatrix}\n```';
  }
  if (q.includes('引用') || q.includes('cite') || q.includes('reference')) {
    return '在 `references.bib` 中添加：\n\n```bibtex\n@inproceedings{mcmahan2017,\n  title={Communication-Efficient Learning\n    of Deep Networks from Decentralized Data},\n  author={McMahan, Brendan and others},\n  booktitle={AISTATS},\n  year={2017}\n}\n```\n\n正文中使用 `\\\\cite{mcmahan2017}` 引用。';
  }
  if (q.includes('语法') || q.includes('grammar') || q.includes('错误')) {
    return '我分析了你的 LaTeX 代码，发现以下潜在问题：\n\n1. `\\\\usepackage{amsfont}` → 应为 `\\\\usepackage{amsfonts}`（多了一个 s）\n2. `\\\\usepackage[bm]` → 应为 `\\\\usepackage{bm}`（方括号应为花括号）\n3. 建议在 `\\\\begin{document}` 前添加 `\\\\usepackage{microtype}` 以优化排版';
  }
  if (q.includes('解释') || q.includes('explain')) {
    return '我来解释这段代码的含义：\n\n- `\\\\let\\\\openbox\\\\relax` — 清除 `openbox` 命令的定义，避免与 `amsthm` 冲突\n- `\\\\usepackage[noend]{algpseudocode}` — 加载伪代码包，`noend` 参数隐藏 end 语句\n- `\\\\usepackage{newtxtext}` + `\\\\usepackage{newtxmath}` — 使用 Times New Roman 风格的字体，适合 IEEE 论文';
  }
  return `我理解你的问题是关于「${query}」。\n\n在学术写作中，这部分建议：\n\n1. **清晰性**：每个段落聚焦一个核心论点，首句即主旨\n2. **连贯性**：使用 *Therefore*, *However*, *Moreover* 等过渡词\n3. **精确性**：避免模糊表述，用实验数据支撑每个论断\n\n需要我帮你修改具体段落吗？把相关文本发给我即可。`;
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative my-1.5 rounded-lg overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between px-3 py-1" style={{ background: '#1f2937' }}>
        <span className="text-[10px] text-gray-400 font-mono">latex</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <CheckOutlined style={{ fontSize: '10px' }} /> : <CopyOutlined style={{ fontSize: '10px' }} />}
          <span>{copied ? '已复制' : '复制'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2 font-mono text-[11px] leading-relaxed" style={{ background: '#282c34', color: '#abb2bf', margin: 0 }}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

interface WritingAiChatProps {
  aiPrompt?: string;
  onPromptConsumed?: () => void;
}

export default function WritingAiChat({ aiPrompt, onPromptConsumed }: WritingAiChatProps = {}) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-fill input when aiPrompt is passed from editor
  useEffect(() => {
    if (aiPrompt) {
      setInput(aiPrompt);
      inputRef.current?.focus();
      if (onPromptConsumed) {
        onPromptConsumed();
      }
    }
  }, [aiPrompt, onPromptConsumed]);

  const handleSend = () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: `u${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };
    const query = input.trim();
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const aiMsg: Message = {
        id: `a${Date.now()}`,
        role: 'assistant',
        content: getMockResponse(query),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 1000 + Math.random() * 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(26,92,58,0.12)' }}
          >
            <RobotOutlined style={{ color: '#1a5c3a', fontSize: '12px' }} />
          </div>
          <span className="text-sm font-semibold text-gray-800">AI 写作助手</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(26,92,58,0.1)', color: '#1a5c3a' }}
          >
            在线
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={clearChat}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="清空对话"
          >
            <ClearOutlined style={{ fontSize: '11px' }} />
          </button>
          <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
            <EllipsisOutlined style={{ fontSize: '11px' }} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{
                background: msg.role === 'assistant' ? 'rgba(26,92,58,0.12)' : '#f3f4f6',
              }}
            >
              {msg.role === 'assistant' ? (
                <RobotOutlined style={{ color: '#1a5c3a', fontSize: '10px' }} />
              ) : (
                <UserOutlined style={{ color: '#6b7280', fontSize: '10px' }} />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'text-white rounded-tr-sm whitespace-pre-wrap'
                  : 'text-gray-700 rounded-tl-sm border border-gray-100'
              }`}
              style={{
                background: msg.role === 'user' ? '#1a5c3a' : '#f9fafb',
                fontSize: '12px',
                lineHeight: 1.6,
              }}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
                      const isBlock = className?.startsWith('language-');
                      return isBlock ? (
                        <CodeBlock>{String(children).replace(/\n$/, '')}</CodeBlock>
                      ) : (
                        <code className="bg-gray-200 text-orange-600 rounded px-1 py-0.5 font-mono" style={{ fontSize: '11px' }}>{children}</code>
                      );
                    },
                    pre: ({ children }) => <>{children}</>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div className="flex gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(26,92,58,0.12)' }}
            >
              <RobotOutlined style={{ color: '#1a5c3a', fontSize: '10px' }} />
            </div>
            <div
              className="rounded-2xl rounded-tl-sm border border-gray-100 px-3 py-2.5 flex items-center gap-1"
              style={{ background: '#f9fafb' }}
            >
              {[0, 150, 300].map((delay) => (
                <div
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="px-3 py-2 border-t border-gray-100 shrink-0">
        <div className="flex flex-wrap gap-1">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => setInput(action)}
              className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="px-3 pb-3 pt-1 shrink-0">
        <div
          className="flex items-end gap-2 rounded-xl border border-gray-200 px-3 py-2 transition-all"
          style={{ background: '#f9fafb' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(26,92,58,0.4)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="向 AI 提问或描述你的需求..."
            rows={2}
            className="flex-1 bg-transparent text-xs text-gray-700 resize-none outline-none placeholder-gray-400"
            style={{ fontSize: '12px', lineHeight: 1.6 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#1a5c3a' }}
          >
            <SendOutlined style={{ fontSize: '11px' }} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">
          Enter 发送 · Shift+Enter 换行
        </p>
      </div>
    </div>
  );
}
