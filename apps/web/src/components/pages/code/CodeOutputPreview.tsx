'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ClearOutlined,
  CaretRightOutlined,
  CodeOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

interface OutputLine {
  id: string;
  type: 'stdout' | 'stderr' | 'info' | 'success';
  text: string;
  timestamp: string;
}

const MOCK_OUTPUT: OutputLine[] = [
  { id: '1', type: 'info', text: '$ python src/main.py', timestamp: '15:32:01' },
  { id: '2', type: 'stdout', text: 'Training on cuda', timestamp: '15:32:02' },
  { id: '3', type: 'stdout', text: 'Model parameters: 264,961', timestamp: '15:32:02' },
  { id: '4', type: 'stdout', text: 'Epoch  10 | Train Loss: 0.4321 | Test Loss: 0.4518', timestamp: '15:32:04' },
  { id: '5', type: 'stdout', text: 'Epoch  20 | Train Loss: 0.1872 | Test Loss: 0.2034', timestamp: '15:32:06' },
  { id: '6', type: 'stdout', text: 'Epoch  30 | Train Loss: 0.0943 | Test Loss: 0.1187', timestamp: '15:32:08' },
  { id: '7', type: 'stderr', text: 'UserWarning: torch.cuda.amp.autocast is deprecated', timestamp: '15:32:09' },
  { id: '8', type: 'stdout', text: 'Epoch  40 | Train Loss: 0.0512 | Test Loss: 0.0798', timestamp: '15:32:10' },
  { id: '9', type: 'stdout', text: 'Epoch  50 | Train Loss: 0.0287 | Test Loss: 0.0654', timestamp: '15:32:12' },
  { id: '10', type: 'stdout', text: '', timestamp: '15:32:12' },
  { id: '11', type: 'success', text: 'Training complete!', timestamp: '15:32:12' },
  { id: '12', type: 'stdout', text: 'Final Test Loss: 0.0654', timestamp: '15:32:12' },
  { id: '13', type: 'info', text: '进程已退出，退出码: 0  (耗时 11.2s)', timestamp: '15:32:13' },
];

type TabType = 'terminal' | 'output' | 'problems';

export default function CodeOutputPreview() {
  const [activeTab, setActiveTab] = useState<TabType>('terminal');
  const [outputLines, setOutputLines] = useState<OutputLine[]>(MOCK_OUTPUT);
  const [terminalInput, setTerminalInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputLines]);

  const clearOutput = () => {
    setOutputLines([]);
  };

  const handleTerminalSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && terminalInput.trim()) {
      const cmd = terminalInput.trim();
      const newLines: OutputLine[] = [
        ...outputLines,
        {
          id: `cmd-${Date.now()}`,
          type: 'info',
          text: `$ ${cmd}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        },
      ];

      // Mock response for some commands
      if (cmd === 'python src/main.py' || cmd === 'python main.py') {
        setTimeout(() => {
          setOutputLines((prev) => [
            ...prev,
            { id: `r-${Date.now()}`, type: 'stdout', text: 'Training on cuda', timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) },
            { id: `r2-${Date.now()}`, type: 'stdout', text: 'Model parameters: 264,961', timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) },
            { id: `r3-${Date.now()}`, type: 'success', text: 'Training started...', timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) },
          ]);
        }, 500);
      } else if (cmd === 'pip list' || cmd === 'pip freeze') {
        setTimeout(() => {
          setOutputLines((prev) => [
            ...prev,
            { id: `p1-${Date.now()}`, type: 'stdout', text: 'torch==2.1.0', timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) },
            { id: `p2-${Date.now()}`, type: 'stdout', text: 'numpy==1.24.3', timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) },
            { id: `p3-${Date.now()}`, type: 'stdout', text: 'matplotlib==3.7.2', timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) },
            { id: `p4-${Date.now()}`, type: 'stdout', text: 'scikit-learn==1.3.0', timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) },
          ]);
        }, 300);
      } else if (cmd === 'clear') {
        setOutputLines([]);
        setTerminalInput('');
        return;
      } else {
        setTimeout(() => {
          setOutputLines((prev) => [
            ...prev,
            { id: `e-${Date.now()}`, type: 'stderr', text: `bash: ${cmd}: command simulated`, timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) },
          ]);
        }, 200);
      }

      setOutputLines(newLines);
      setTerminalInput('');
    }
  };

  const getLineColor = (type: OutputLine['type']) => {
    switch (type) {
      case 'stderr': return '#dc2626';
      case 'info': return '#2563eb';
      case 'success': return '#16a34a';
      default: return '#374151';
    }
  };

  const getLineIcon = (type: OutputLine['type']) => {
    switch (type) {
      case 'stderr': return <WarningOutlined style={{ color: '#f87171', fontSize: '10px' }} />;
      case 'success': return <CheckCircleOutlined style={{ color: '#4ade80', fontSize: '10px' }} />;
      default: return null;
    }
  };

  const problems = [
    { line: 7, col: 1, severity: 'warning' as const, message: "Unused import: 'matplotlib.pyplot'" },
    { line: 45, col: 12, severity: 'info' as const, message: 'Consider using torch.no_grad() context manager' },
  ];

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'terminal', label: '终端' },
    { key: 'output', label: '输出' },
    { key: 'problems', label: '问题', count: problems.length },
  ];

  return (
    <div className="h-full flex flex-col" style={{ background: '#ffffff' }}>
      {/* Tab bar */}
      <div
        className="flex items-center justify-between shrink-0 border-b"
        style={{ background: '#f5f5f5', borderColor: '#e0e0e0' }}
      >
        <div className="flex items-center">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-3 py-1.5 text-xs transition-colors relative"
              style={{
                color: activeTab === tab.key ? '#1f2937' : '#9ca3af',
                background: activeTab === tab.key ? '#ffffff' : 'transparent',
                fontWeight: activeTab === tab.key ? 600 : 400,
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className="ml-1 px-1 py-0 rounded-full text-[10px]"
                  style={{ background: '#f59e0b', color: '#fff' }}
                >
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#1a5c3a' }} />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 pr-2">
          <button
            onClick={clearOutput}
            className="w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
            style={{ color: '#6b7280' }}
            title="清空"
          >
            <ClearOutlined style={{ fontSize: '10px' }} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto font-mono text-xs" style={{ background: '#fafafa' }}>
        {activeTab === 'terminal' && (
          <div className="p-2">
            {outputLines.map((line) => (
              <div key={line.id} className="flex items-start gap-2 py-0.5" style={{ lineHeight: '18px' }}>
                <span style={{ color: '#9ca3af', fontSize: '10px', minWidth: '52px', flexShrink: 0 }}>
                  {line.timestamp}
                </span>
                {getLineIcon(line.type) && <span className="mt-0.5">{getLineIcon(line.type)}</span>}
                <span style={{ color: getLineColor(line.type) }}>{line.text}</span>
              </div>
            ))}
            <div ref={bottomRef} />

            {/* Terminal input */}
            <div className="flex items-center gap-2 mt-1 py-0.5">
              <span style={{ color: '#16a34a' }}>$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={handleTerminalSubmit}
                placeholder="输入命令..."
                className="flex-1 bg-transparent text-xs outline-none font-mono"
                style={{ color: '#374151', caretColor: '#374151' }}
              />
            </div>
          </div>
        )}

        {activeTab === 'output' && (
          <div className="p-2">
            {outputLines.filter((l) => l.type === 'stdout' || l.type === 'success').map((line) => (
              <div key={line.id} className="py-0.5" style={{ color: getLineColor(line.type), lineHeight: '18px' }}>
                {line.text}
              </div>
            ))}
            {outputLines.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: '#9ca3af' }}>
                <CaretRightOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                <span className="text-xs">点击“运行”按钮执行代码</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'problems' && (
          <div className="p-2">
            {problems.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <WarningOutlined style={{ color: p.severity === 'warning' ? '#f59e0b' : '#3b82f6', fontSize: '11px' }} />
                <span style={{ color: '#374151' }}>{p.message}</span>
                <span className="ml-auto" style={{ color: '#9ca3af', fontSize: '10px' }}>
                  main.py:{p.line}:{p.col}
                </span>
              </div>
            ))}
            {problems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: '#9ca3af' }}>
                <CheckCircleOutlined style={{ fontSize: '24px', marginBottom: '8px', color: '#16a34a' }} />
                <span className="text-xs">没有发现问题</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom status */}
      <div
        className="flex items-center justify-between px-3 shrink-0 border-t"
        style={{ background: '#f5f5f5', borderColor: '#e0e0e0', height: '20px', color: '#6b7280', fontSize: '10px' }}
      >
        <div className="flex items-center gap-2">
          <CodeOutlined style={{ fontSize: '10px' }} />
          <span>Python 3.11.5</span>
          <span>•</span>
          <span>venv: ml-experiment</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{problems.length} 警告</span>
          <span>•</span>
          <span>0 错误</span>
        </div>
      </div>
    </div>
  );
}
