'use client';
import { useEffect, useRef, useState } from 'react';
import {
  CaretRightOutlined,
  SaveOutlined,
  DownloadOutlined,
  FileOutlined,
  CloseOutlined,
  RobotOutlined,
  BugOutlined,
  ConsoleSqlOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons';
import CodeOutputPreview from './CodeOutputPreview';

const MOCK_PYTHON_CONTENT = `import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import numpy as np
import matplotlib.pyplot as plt
from typing import Tuple, List, Optional

# ============================================================
# Configuration
# ============================================================
class Config:
    """Training configuration."""
    batch_size: int = 64
    learning_rate: float = 1e-3
    epochs: int = 50
    hidden_dim: int = 256
    num_layers: int = 3
    dropout: float = 0.1
    device: str = "cuda" if torch.cuda.is_available() else "cpu"
    seed: int = 42

config = Config()
torch.manual_seed(config.seed)
np.random.seed(config.seed)

# ============================================================
# Dataset
# ============================================================
class SyntheticDataset(Dataset):
    """Generate synthetic regression data for demonstration."""

    def __init__(self, num_samples: int = 1000, input_dim: int = 10):
        self.x = torch.randn(num_samples, input_dim)
        # True function: y = sin(x1) + x2^2 + noise
        self.y = (
            torch.sin(self.x[:, 0])
            + self.x[:, 1] ** 2
            + 0.1 * torch.randn(num_samples)
        ).unsqueeze(1)

    def __len__(self) -> int:
        return len(self.x)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        return self.x[idx], self.y[idx]

# ============================================================
# Model
# ============================================================
class MLPRegressor(nn.Module):
    """Multi-layer perceptron for regression tasks."""

    def __init__(
        self,
        input_dim: int = 10,
        hidden_dim: int = 256,
        num_layers: int = 3,
        dropout: float = 0.1,
    ):
        super().__init__()
        layers: List[nn.Module] = []

        # Input layer
        layers.append(nn.Linear(input_dim, hidden_dim))
        layers.append(nn.ReLU())
        layers.append(nn.Dropout(dropout))

        # Hidden layers
        for _ in range(num_layers - 1):
            layers.append(nn.Linear(hidden_dim, hidden_dim))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout))

        # Output layer
        layers.append(nn.Linear(hidden_dim, 1))

        self.network = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)

# ============================================================
# Training Loop
# ============================================================
def train_epoch(
    model: nn.Module,
    loader: DataLoader,
    optimizer: optim.Optimizer,
    criterion: nn.Module,
    device: str,
) -> float:
    model.train()
    total_loss = 0.0
    for batch_x, batch_y in loader:
        batch_x, batch_y = batch_x.to(device), batch_y.to(device)

        optimizer.zero_grad()
        pred = model(batch_x)
        loss = criterion(pred, batch_y)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * batch_x.size(0)

    return total_loss / len(loader.dataset)

def evaluate(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: str,
) -> float:
    model.eval()
    total_loss = 0.0
    with torch.no_grad():
        for batch_x, batch_y in loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            pred = model(batch_x)
            loss = criterion(pred, batch_y)
            total_loss += loss.item() * batch_x.size(0)
    return total_loss / len(loader.dataset)

# ============================================================
# Main
# ============================================================
if __name__ == "__main__":
    # Prepare data
    train_data = SyntheticDataset(num_samples=800)
    test_data = SyntheticDataset(num_samples=200)
    train_loader = DataLoader(train_data, batch_size=config.batch_size, shuffle=True)
    test_loader = DataLoader(test_data, batch_size=config.batch_size)

    # Initialize model
    model = MLPRegressor(
        hidden_dim=config.hidden_dim,
        num_layers=config.num_layers,
        dropout=config.dropout,
    ).to(config.device)

    optimizer = optim.Adam(model.parameters(), lr=config.learning_rate)
    criterion = nn.MSELoss()

    print(f"Training on {config.device}")
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")

    # Training
    history = {"train_loss": [], "test_loss": []}
    for epoch in range(1, config.epochs + 1):
        train_loss = train_epoch(model, train_loader, optimizer, criterion, config.device)
        test_loss = evaluate(model, test_loader, criterion, config.device)
        history["train_loss"].append(train_loss)
        history["test_loss"].append(test_loss)

        if epoch % 10 == 0:
            print(f"Epoch {epoch:3d} | Train Loss: {train_loss:.4f} | Test Loss: {test_loss:.4f}")

    print("\\nTraining complete!")
    print(f"Final Test Loss: {history['test_loss'][-1]:.4f}")
`;

interface Tab {
  id: string;
  name: string;
  modified: boolean;
}

interface CodePythonEditorProps {
  activeFile?: string;
  onSendToAi?: (text: string) => void;
}

export default function CodePythonEditor({ activeFile = 'main.py', onSendToAi }: CodePythonEditorProps) {
  const [content, setContent] = useState(MOCK_PYTHON_CONTENT);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [selectedText, setSelectedText] = useState('');
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'main', name: activeFile, modified: false },
    { id: 'model', name: 'model.py', modified: false },
  ]);
  const [activeTab, setActiveTab] = useState('main');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);

  const lines = content.split('\n');
  const lineCount = lines.length;

  const handleScroll = () => {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCursorChange = () => {
    if (textareaRef.current) {
      const { selectionStart, selectionEnd } = textareaRef.current;
      const textBefore = content.substring(0, selectionStart);
      const lineNum = textBefore.split('\n').length;
      const col = textBefore.split('\n').pop()!.length + 1;
      setCursorPos({ line: lineNum, col });

      // Track selected text
      const selected = content.substring(selectionStart, selectionEnd);
      setSelectedText(selected);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = content.substring(0, start) + '    ' + content.substring(end);
      setContent(newContent);
      setTabs((prev) => prev.map((t) => (t.id === activeTab ? { ...t, modified: true } : t)));
      requestAnimationFrame(() => {
        ta.selectionStart = start + 4;
        ta.selectionEnd = start + 4;
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab ? { ...t, modified: true } : t))
    );
  };

  const closeTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);
    if (activeTab === tabId) {
      setActiveTab(newTabs[0].id);
    }
  };

  // Terminal panel state
  const [showTerminal, setShowTerminal] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('code_showTerminal');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [terminalHeight, setTerminalHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('code_terminalHeight');
      return saved ? parseInt(saved, 10) : 200;
    }
    return 200;
  });
  const draggingTerminal = useRef(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(0);

  useEffect(() => {
    localStorage.setItem('code_showTerminal', showTerminal.toString());
  }, [showTerminal]);

  useEffect(() => {
    localStorage.setItem('code_terminalHeight', terminalHeight.toString());
  }, [terminalHeight]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingTerminal.current) return;
      const delta = dragStartY.current - e.clientY;
      setTerminalHeight(Math.max(100, Math.min(500, dragStartH.current + delta)));
    };
    const handleMouseUp = () => {
      if (draggingTerminal.current) {
        draggingTerminal.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startTerminalDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    draggingTerminal.current = true;
    dragStartY.current = e.clientY;
    dragStartH.current = terminalHeight;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#ffffff' }}>
      {/* Tab bar + Toolbar */}
      <div
        className="flex items-center shrink-0 border-b"
        style={{ background: '#f5f5f5', borderColor: '#e0e0e0' }}
      >
        {/* Tabs */}
        <div className="flex items-center overflow-x-auto flex-1 min-w-0">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer shrink-0 border-r select-none ${
                activeTab === tab.id
                  ? 'text-gray-800 border-t-2 border-t-blue-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              style={{
                background: activeTab === tab.id ? '#ffffff' : 'transparent',
                borderRightColor: '#e0e0e0',
              }}
            >
              <span style={{ fontSize: '11px' }}>🐍</span>
              <span>{tab.name}</span>
              {tab.modified && (
                <span style={{ color: '#9ca3af', fontSize: '8px' }}>●</span>
              )}
              <button
                onClick={(e) => closeTab(e, tab.id)}
                className="text-gray-400 hover:text-gray-700 ml-0.5"
                style={{ fontSize: '11px', lineHeight: 1 }}
              >
                <CloseOutlined />
              </button>
            </div>
          ))}
        </div>

        {/* Toolbar actions */}
        <div className="flex items-center gap-1 px-2 shrink-0">
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-white rounded transition-colors"
            style={{ background: '#1a5c3a', fontSize: '12px' }}
          >
            <CaretRightOutlined />
            <span>运行</span>
          </button>
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors border border-gray-300"
            style={{ background: '#ffffff', color: '#374151', fontSize: '12px' }}
          >
            <BugOutlined />
            <span>调试</span>
          </button>
          <button
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
            style={{ color: '#6b7280' }}
            title="保存"
          >
            <SaveOutlined style={{ fontSize: '11px' }} />
          </button>
          <button
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
            style={{ color: '#6b7280' }}
            title="下载"
          >
            <DownloadOutlined style={{ fontSize: '11px' }} />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={() => {
              if (selectedText && onSendToAi) {
                onSendToAi(selectedText);
              }
            }}
            disabled={!selectedText}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: selectedText ? '#1a5c3a' : '#d1d5db',
              color: '#ffffff',
              fontSize: '12px',
            }}
            title={selectedText ? '发送选中内容给 AI' : '请先选中文本'}
          >
            <RobotOutlined />
            <span>问 AI</span>
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors hover:bg-gray-200"
            style={{ color: '#6b7280', fontSize: '12px' }}
            title={showTerminal ? '隐藏终端' : '显示终端'}
          >
            <ConsoleSqlOutlined style={{ fontSize: '11px' }} />
            <span>终端</span>
            {showTerminal ? <DownOutlined style={{ fontSize: '8px' }} /> : <UpOutlined style={{ fontSize: '8px' }} />}
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Code area */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Line numbers */}
            <div
              ref={lineNumRef}
              className="select-none overflow-hidden shrink-0 pt-2 pb-2 text-right font-mono border-r"
              style={{
                background: '#fafafa',
                color: '#9ca3af',
                fontSize: '12px',
                lineHeight: '20px',
                width: '44px',
                paddingRight: '8px',
                borderColor: '#e5e7eb',
              }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i + 1} style={{ lineHeight: '20px' }}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Textarea */}
            <div className="flex-1 overflow-hidden" style={{ background: '#ffffff' }}>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                onClick={handleCursorChange}
                onKeyUp={handleCursorChange}
                spellCheck={false}
                className="w-full h-full resize-none outline-none border-none p-2 pl-1 font-mono"
                style={{
                  background: '#ffffff',
                  color: '#1f2937',
                  fontSize: '13px',
                  lineHeight: '20px',
                  caretColor: '#1f2937',
                  tabSize: 4,
                }}
              />
            </div>
          </div>

          {/* Terminal panel (bottom, VS Code style) */}
          {showTerminal && (
            <>
              {/* Horizontal drag divider */}
              <HorizontalDivider onMouseDown={startTerminalDrag} />
              <div className="shrink-0 overflow-hidden" style={{ height: terminalHeight }}>
                <CodeOutputPreview />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div
        className="flex items-center justify-between px-3 shrink-0 border-t"
        style={{ background: '#1a5c3a', color: '#ffffff', fontSize: '11px', height: '22px', borderColor: '#e5e7eb' }}
      >
        <div className="flex items-center gap-3">
          <span>Python</span>
          <span>UTF-8</span>
          <span>LF</span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            行 {cursorPos.line}, 列 {cursorPos.col}
          </span>
          <span>Python 3.11</span>
          <span>Spaces: 4</span>
        </div>
      </div>
    </div>
  );
}

function HorizontalDivider({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="shrink-0 cursor-row-resize transition-colors duration-150 relative z-10"
      style={{
        height: '4px',
        background: hovered ? 'rgba(26,92,58,0.5)' : '#e5e7eb',
      }}
    />
  );
}
