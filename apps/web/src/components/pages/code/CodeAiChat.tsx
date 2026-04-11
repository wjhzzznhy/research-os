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
  CloseOutlined,
  CodeOutlined,
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
      '你好！我是你的 Python 代码助手。我可以帮你：\n\n• 编写和优化 Python 代码\n• 调试错误和异常\n• 解释算法和数据结构\n• 推荐最佳实践和库\n\n请告诉我你需要什么帮助？',
  },
];

const QUICK_ACTIONS = ['优化代码', '解释错误', '添加注释', '写单元测试', '性能分析'];

function getMockResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('优化') || q.includes('optimize') || q.includes('性能')) {
    return '分析你的代码后，有以下优化建议：\n\n1. **向量化操作**：用 NumPy 批量计算替代 Python 循环\n2. **数据加载**：增加 `num_workers` 参数加速数据加载\n3. **混合精度训练**：使用 `torch.cuda.amp` 减少显存占用\n\n示例：\n```python\n# 使用混合精度训练\nscaler = torch.cuda.amp.GradScaler()\nwith torch.cuda.amp.autocast():\n    pred = model(batch_x)\n    loss = criterion(pred, batch_y)\nscaler.scale(loss).backward()\nscaler.step(optimizer)\nscaler.update()\n```';
  }
  if (q.includes('错误') || q.includes('error') || q.includes('bug') || q.includes('调试')) {
    return '根据你的代码，可能存在以下问题：\n\n1. **维度不匹配**：检查 `input_dim` 是否与数据维度一致\n2. **梯度消失**：深层网络建议用 `nn.BatchNorm1d`\n3. **学习率过大**：尝试用 `ReduceLROnPlateau` 调度器\n\n调试建议：\n```python\n# 打印中间维度\nprint(f"Input shape: {batch_x.shape}")\nprint(f"Output shape: {model(batch_x).shape}")\nprint(f"Target shape: {batch_y.shape}")\n```';
  }
  if (q.includes('测试') || q.includes('test') || q.includes('unittest')) {
    return '为你的模型生成单元测试：\n\n```python\nimport pytest\nimport torch\nfrom src.model import MLPRegressor\n\nclass TestMLPRegressor:\n    def setup_method(self):\n        self.model = MLPRegressor(\n            input_dim=10, hidden_dim=64, num_layers=2\n        )\n\n    def test_output_shape(self):\n        x = torch.randn(32, 10)\n        out = self.model(x)\n        assert out.shape == (32, 1)\n\n    def test_forward_no_nan(self):\n        x = torch.randn(16, 10)\n        out = self.model(x)\n        assert not torch.isnan(out).any()\n\n    def test_gradient_flow(self):\n        x = torch.randn(8, 10, requires_grad=True)\n        out = self.model(x).sum()\n        out.backward()\n        assert x.grad is not None\n```';
  }
  if (q.includes('注释') || q.includes('comment') || q.includes('文档')) {
    return '建议添加以下文档和注释：\n\n1. **模块级 docstring**：描述文件用途\n2. **函数 docstring**：用 Google/NumPy 风格\n3. **类型注解**：参数和返回值类型\n\n示例：\n```python\ndef train_epoch(\n    model: nn.Module,\n    loader: DataLoader,\n    optimizer: optim.Optimizer,\n    criterion: nn.Module,\n    device: str,\n) -> float:\n    """Train model for one epoch.\n\n    Args:\n        model: The neural network model.\n        loader: Training data loader.\n        optimizer: Optimization algorithm.\n        criterion: Loss function.\n        device: Device to run on (cuda/cpu).\n\n    Returns:\n        Average training loss for the epoch.\n    """\n```';
  }
  if (q.includes('解释') || q.includes('explain') || q.includes('什么意思')) {
    return '我来解释这段代码：\n\n- `nn.Sequential(*layers)` — 将层列表展开为顺序模型，按顺序执行每一层\n- `loss.backward()` — 反向传播，计算所有参数的梯度\n- `optimizer.zero_grad()` — 清零梯度，防止梯度累积\n- `model.train()` / `model.eval()` — 切换训练/评估模式，影响 Dropout 和 BatchNorm 的行为\n- `torch.no_grad()` — 禁用梯度计算，节省内存，加速推理';
  }
  return '关于「' + query + '」，建议：\n\n1. **代码结构**：遵循 PEP 8 规范，模块化设计\n2. **错误处理**：添加 try-except 和参数校验\n3. **日志记录**：用 `logging` 模块替代 `print`\n\n```python\nimport logging\n\nlogger = logging.getLogger(__name__)\nlogger.setLevel(logging.INFO)\n\n# 替代 print\nlogger.info(f"Epoch {epoch} | Loss: {loss:.4f}")\n```\n\n需要我帮你修改具体代码吗？';
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
        <span className="text-[10px] text-gray-400 font-mono">python</span>
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

interface CodeContext {
  code: string;
  language?: string;
}

interface CodeAiChatProps {
  aiPrompt?: string;
  onPromptConsumed?: () => void;
}

export default function CodeAiChat({ aiPrompt, onPromptConsumed }: CodeAiChatProps = {}) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeContext, setCodeContext] = useState<CodeContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-fill code context when aiPrompt is passed from editor
  useEffect(() => {
    if (aiPrompt) {
      setCodeContext({ code: aiPrompt, language: 'python' });
      inputRef.current?.focus();
      if (onPromptConsumed) {
        onPromptConsumed();
      }
    }
  }, [aiPrompt, onPromptConsumed]);

  const handleSend = () => {
    if ((!input.trim() && !codeContext) || loading) return;

    // Build message content with code context if present
    let content = input.trim();
    if (codeContext) {
      content = `${content}\n\n\`\`\`${codeContext.language || ''}\n${codeContext.code}\n\`\`\``;
    }

    const userMsg: Message = {
      id: `u${Date.now()}`,
      role: 'user',
      content: content || codeContext!.code,
    };
    const query = content || codeContext!.code;
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setCodeContext(null);
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
          <span className="text-sm font-semibold text-gray-800">AI 代码助手</span>
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
        {/* Code context card */}
        {codeContext && (
          <div className="mb-2 rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-1.5">
                <CodeOutlined style={{ fontSize: '11px', color: '#6b7280' }} />
                <span className="text-[11px] text-gray-600 font-medium">
                  {codeContext.language || 'code'} · {codeContext.code.split('\n').length} 行
                </span>
              </div>
              <button
                onClick={() => setCodeContext(null)}
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                title="移除代码"
              >
                <CloseOutlined style={{ fontSize: '10px' }} />
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto">
              <pre className="px-3 py-2 text-[11px] font-mono text-gray-700 leading-relaxed" style={{ margin: 0 }}>
                {codeContext.code}
              </pre>
            </div>
          </div>
        )}
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
            disabled={(!input.trim() && !codeContext) || loading}
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
