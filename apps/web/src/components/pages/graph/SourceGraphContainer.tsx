"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { NodeMouseHandler, applyNodeChanges, NodeChange } from 'reactflow';
import { Sparkles, Search, ArrowRight, HelpCircle, X } from 'lucide-react';
import FlowCanvas from './FlowCanvas';
import SidebarRight from './SidebarRight';
import { Paper } from '@/types/pages/paper';
import { GraphNode, GraphEdge, FlowData } from '@/types/pages/graph';
import { HistorySidebar } from '@/components/pages/common/HistorySidebar';
import { CaretRightOutlined, CaretLeftOutlined } from '@ant-design/icons';
import { useHistory } from '@/context/HistoryContext';
import { HistoryTrigger } from '@/components/pages/common/HistoryTrigger';

// 模拟生成论文数据
const createDummyPaper = (title: string): Paper => ({
  id: Math.random().toString(36).substr(2, 9),
  title,
  author: 'AI Research',
  year: 2023 + Math.floor(Math.random() * 2),
  citations: Math.floor(Math.random() * 500) + 10,
  abstract: `This is an AI-generated abstract for "${title}". It explores the deep connections between concepts in a knowledge graph structure.`,
  url: '#'
});

export default function SourceGraphContainer() {
  // 状态管理
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);

  const [searchVal, setSearchVal] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const [isRightOpen, setIsRightOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);

  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [past, setPast] = useState<FlowData[]>([]);
  const [future, setFuture] = useState<FlowData[]>([]);

  const { historyState } = useHistory();
  const isHistoryOpen = historyState.isOpen;

  // 引用以保持最新的节点状态供回调使用
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const isTimeTravelRef = useRef(false);
  const skipHistoryRef = useRef(false);
  
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const createSnapshot = useCallback((): FlowData => ({
    nodes: nodesRef.current.map((node) => ({
      ...node,
      data: {
        ...node.data,
        paper: node.data.paper ? { ...node.data.paper } : node.data.paper
      },
      position: { ...node.position },
      style: node.style ? { ...node.style } : node.style
    })),
    edges: edgesRef.current.map((edge) => ({
      ...edge,
      style: edge.style ? { ...edge.style } : edge.style
    }))
  }), []);

  const pushHistory = useCallback(() => {
    if (isTimeTravelRef.current) return;
    const snapshot = createSnapshot();
    setPast(prev => {
      const next = [...prev, snapshot];
      return next.length > 50 ? next.slice(-50) : next;
    });
    setFuture([]);
  }, [createSnapshot]);

  const applySnapshot = useCallback((snapshot: FlowData) => {
    isTimeTravelRef.current = true;
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    requestAnimationFrame(() => {
      isTimeTravelRef.current = false;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setPast(prev => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setFuture(next => [createSnapshot(), ...next]);
      applySnapshot(previous);
      return prev.slice(0, -1);
    });
  }, [applySnapshot, createSnapshot]);

  const handleRedo = useCallback(() => {
    setFuture(prev => {
      if (prev.length === 0) return prev;
      const nextSnapshot = prev[0];
      setPast(next => [...next, createSnapshot()]);
      applySnapshot(nextSnapshot);
      return prev.slice(1);
    });
  }, [applySnapshot, createSnapshot]);

  // 处理搜索/输入
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchVal.trim()) return;

    setLoading(true);
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 600));

    const newPaper = createDummyPaper(searchVal);
    const newNodeId = newPaper.id;

    // 检查是否有被选中的节点（右键选中的黄色节点）
    const selectedNode = nodesRef.current.find(n => n.data.isSelected);

    const newNode: GraphNode = {
      id: newNodeId,
      type: 'custom',
      data: { 
        label: newPaper.title, 
        paper: newPaper,
        isRoot: !hasSearched && !selectedNode, // 如果是第一次搜索且无选中，作为根
        translation: `Translation: ${newPaper.title.substring(0, 10)}...` // 模拟翻译
      },
      position: { 
        // 如果有选中节点，放在选中节点附近；否则放在中心或随机
        x: selectedNode ? selectedNode.position.x + (Math.random() - 0.5) * 300 : 0, 
        y: selectedNode ? selectedNode.position.y + (Math.random() - 0.5) * 300 : 0
      },
      style: { width: 120, height: 120 } // 初始大小
    };

    const newEdges: GraphEdge[] = [];
    if (selectedNode) {
      newEdges.push({
        id: `e-${selectedNode.id}-${newNodeId}`,
        source: selectedNode.id,
        target: newNodeId,
        animated: true,
        // 把 '#FFD700' 改为你的主色或亮绿色
        style: { stroke: '#10b981', strokeWidth: 2 } 
      });
    }

    pushHistory();
    setNodes(prev => [...prev, newNode]);
    if (newEdges.length > 0) {
      setEdges(prev => [...prev, ...newEdges]);
    }

    setHasSearched(true);
    setSearchVal('');
    setLoading(false);
  };

  const handleNodeClick: NodeMouseHandler = useCallback((event, node) => {
    const clickedNode = node as GraphNode;
   
    setSelectedPaper(clickedNode.data.paper);
    setIsRightOpen(true);

    const childCount = Math.floor(Math.random() * 3) + 3;
    const radius = 250;
    const newNodes: GraphNode[] = [];
    const newEdges: GraphEdge[] = [];

    for (let i = 0; i < childCount; i++) {
      const angle = (2 * Math.PI * i) / childCount;
      const childTitle = `${clickedNode.data.label} - Sub ${i + 1}`;
      const childPaper = createDummyPaper(childTitle);
      const childNode: GraphNode = {
        id: childPaper.id,
        type: 'custom',
        data: {
          label: childPaper.title,
          paper: childPaper,
          translation: `Trans: ${childTitle}`
        },
        position: {
          x: clickedNode.position.x + radius * Math.cos(angle) + (Math.random() * 40),
          y: clickedNode.position.y + radius * Math.sin(angle) + (Math.random() * 40)
        },
        style: { width: 100, height: 100 }
      };

      const childEdge: GraphEdge = {
        id: `e-${clickedNode.id}-${childPaper.id}`,
        source: clickedNode.id,
        target: childPaper.id,
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 1, opacity: 0.6 }
      };

      newNodes.push(childNode);
      newEdges.push(childEdge);
    }

    const nextNodes = [...nodesRef.current, ...newNodes];
    const nextEdges = [...edgesRef.current, ...newEdges];
   
   // 在添加新节点之前先保存当前状态
   pushHistory();
   
   // 设置标志，防止onNodesChange再次调用pushHistory
   skipHistoryRef.current = true;
    setNodes(nextNodes);
    setEdges(nextEdges);
   
   // 重置标志
   setTimeout(() => {
     skipHistoryRef.current = false;
   }, 0);
 }, [pushHistory]);

  // 处理节点右键点击 - 选中逻辑
  const handleNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault(); // 阻止默认右键菜单
    
    setNodes(nds => nds.map(n => {
      if (n.id === node.id) {
        // 切换选中状态
        return {
          ...n,
          data: { ...n.data, isSelected: !n.data.isSelected }
        };
      }
      // 单选逻辑：如果需要多选，去掉这行；如果需要单选，保留这行并将其他设为 false
      // 这里需求似乎暗示可以有“当前选中的词”，通常指单个，但也可能支持多个。
      // "如果当前有选中的词" -> 假设支持单选，或者连接到所有选中的词。
      // 为了简单直观，我们这里实现“单选切换”，即点击新的会取消旧的？
      // 用户说 "右键点击词语可以选中/取消选中(选中变黄色)" -> 听起来像 Toggle。
      // 并没有说互斥。保留 Toggle 逻辑。
      return n;
    }));
  }, []);

  const handleDeleteNode = useCallback(() => {
    const activeNode = nodesRef.current.find(n => n.data.isSelected) || nodesRef.current.find(n => n.selected);
    if (!activeNode) return;
    pushHistory();
    const nodeId = activeNode.id;
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedPaper?.id === activeNode.data.paper.id) {
      setSelectedPaper(null);
      setIsRightOpen(false);
    }
  }, [pushHistory, selectedPaper]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
   if (!isTimeTravelRef.current && !skipHistoryRef.current) {
      const shouldRecord = changes.some(change => {
        if (change.type === 'position') return change.dragging === false;
        if (change.type === 'select') return false;
        return true;
      });
      if (shouldRecord) pushHistory();
    }

    const removedIds = changes
      .filter(change => change.type === 'remove')
      .map(change => change.id);

    setNodes((nds) => applyNodeChanges(changes, nds));

    if (removedIds.length > 0) {
      setEdges(prev => prev.filter(e => !removedIds.includes(e.source) && !removedIds.includes(e.target)));
    }
  }, [pushHistory]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isEditable) return;

      const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey;
      const isRedo = (event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey));

      if (isUndo) {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (isRedo) {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        handleDeleteNode();
        return;
      }

      if (event.key.toLowerCase() === 'h' || event.key === '?') {
        event.preventDefault();
        setShowHelp(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleDeleteNode]);
  return (
    <div className="relative h-full w-full bg-white  overflow-hidden font-sans flex">
      {/* 左侧：历史记录侧边栏 */}
      <div 
        className={`h-full shrink-0 transition-all duration-300 ease-in-out ${isHistoryOpen ? 'w-80 border-r-gray-600! shadow-[4px_0_24px_rgba(0,0,0,0.08)]!' : 'w-0 border-r-0'}`}
        style={{ overflow: 'hidden' }} // 必须有这个，宽度变为0时才能隐藏内部内容
      >
        <div className="w-80 h-full">
          <HistorySidebar 
            position="left" 
            shadowClassName="shadow-[4px_0_24px_rgba(0,0,0,0.08)]!"
            borderClassName="border-none"
            bgClassName="bg-white/95! backdrop-blur-xl!"
          />
        </div>
      </div>


      {/* 右侧：主工作区 */}
      <div className="flex-1 relative h-full overflow-hidden">
        
        {/* 1. 画布底板 */}
        <main className="absolute inset-0 z-10">
          <FlowCanvas 
            nodes={nodes} 
            edges={edges} 
            onNodeClick={handleNodeClick}
            onNodeContextMenu={handleNodeContextMenu}
            onNodesChange={onNodesChange}
            showHelp={showHelp}
            onToggleHelp={() => setShowHelp(prev => !prev)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onDelete={handleDeleteNode}
            canUndo={past.length > 0}
            canRedo={future.length > 0}
          />
        </main>

      {/* 左下角帮助按钮 (移出 ReactFlow，手动控制 z-index 和 translate) */}
        {/* left-6 永远是相对于新画布的边缘 */}
        <div className="absolute bottom-6 left-6 !z-[100] pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-md shadow-sm border border-slate-200 rounded-full overflow-hidden">
             <button 
               onClick={() => setShowHelp(!showHelp)}
               className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
             >
               {showHelp ? <X size={20} /> : <HelpCircle size={20} />}
             </button>
          </div>
        </div>

        {/* 3. 帮助说明窗口 */}
        {showHelp && (
          <div className="absolute bottom-20 left-6 w-80 !z-[100]">
            <div className="bg-white/90 backdrop-blur-md shadow-2xl rounded-xl border border-slate-100 p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800">如何阅读图表</h3>
                <button onClick={() => setShowHelp(!showHelp)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">交互式知识图谱指南：</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1 shrink-0 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span><b>点击</b>节点展开更多关联</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1 shrink-0 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span>
                    <b>右键</b>点击可选中/锁定节点
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1 shrink-0 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span>
                    <b>拖拽</b>可自由调整节点位置
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1 shrink-0 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span>
                    <b>Delete</b> 删除选中节点
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1 shrink-0 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span>
                    <b>Ctrl+Z / Ctrl+Y</b> 撤销与前进
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1 shrink-0 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span>底部输入新词可与选中节点<b>建立连接</b></span>
                </li>
              </ul>
            </div>
          </div>
        )}

      {/* 4. 底部搜索框 */}
        <div 
          className={`absolute z-40 flex justify-center transition-all duration-300 ease-in-out
          ${hasSearched ? 'bottom-8' : 'bottom-1/2 translate-y-1/2'}
          /* 根据左右面板的状态，动态调整搜素框的活动范围 */
          ${isHistoryOpen ? 'left-8' : 'left-0'} 
          ${isRightOpen ? 'right-96' : 'right-0'}
            pointer-events-none px-20
          `}
        >
          <form 
            onSubmit={handleSearch}
            className={`
              pointer-events-auto relative flex items-center w-full max-w-xl bg-white/90 backdrop-blur-xl 
              border border-emerald-100/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)]
              rounded-full transition-all duration-300
              ${loading ? 'scale-95 opacity-90' : 'hover:scale-105 hover:shadow-[0_12px_40px_rgba(26,92,58,0.15)]'}
            `}
          >
            <div className="pl-6 text-slate-400">
              {loading ? <Sparkles className="animate-spin text-emerald-500" size={20} /> : <Search size={20} />}
            </div>
            <input 
              type="text" 
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder={hasSearched ? "输入关键词继续发散..." : "输入核心词，开启知识探索..."}
              className="w-full h-14 px-4 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 font-medium text-lg"
            />
            <button type="submit" className="mr-3 shrink-0 w-9 h-9 flex items-center justify-center bg-[#1a5c3a] hover:bg-[#166534] text-white rounded-full transition-colors shadow-sm">
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </form>
        </div>

        {/* 5. 右侧详情栏 (保持在画布内的绝对定位) */}
        <div className="absolute right-0 top-0 h-full z-30 pointer-events-none flex justify-end">
           <div className={`pointer-events-auto transition-all duration-300 bg-white h-full shadow-[-4px_0_20px_rgba(0,0,0,0.05)] flex
              ${isRightOpen ? 'translate-x-0' : 'translate-x-full'}
           `}>
              <button 
                  onClick={() => setIsRightOpen(!isRightOpen)}
                  className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-12 bg-white rounded-l-md shadow-[-2px_0_5px_rgba(0,0,0,0.05)] flex items-center justify-center text-slate-400 hover:text-[#1a5c3a] cursor-pointer border border-r-0 border-slate-100"
              >
                  {isRightOpen ? <CaretRightOutlined /> : <CaretLeftOutlined />}
              </button>
              <div className="w-96 h-full overflow-hidden">
                  <SidebarRight paper={selectedPaper} />
              </div>
           </div>
        </div>
      </div> 
    </div>
  );
}
