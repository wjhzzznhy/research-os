"use client";

import ReactFlow, {
  Background,
  useReactFlow,
  BackgroundVariant,
  NodeMouseHandler,
  OnNodesChange,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";

import { GraphNode, GraphEdge } from "@/types/pages/graph";
import GraphNodeComponent from "./GraphNode";
import {
  Plus,
  Minus,
  Maximize,
  Undo2,
  Redo2,
  Trash2,
} from "lucide-react";
import { useHistory } from '@/context/HistoryContext';
import { HistoryTrigger } from '@/components/pages/common/HistoryTrigger';

interface FlowCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: NodeMouseHandler;
  onNodeContextMenu?: NodeMouseHandler;
  onNodesChange?: OnNodesChange;
  showHelp: boolean;
  onToggleHelp: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const nodeTypes = {
  custom: GraphNodeComponent,
};

export default function FlowCanvas({
  nodes,
  edges,
  onNodeClick,
  onNodeContextMenu,
  onNodesChange,
  onUndo,
  onRedo,
  onDelete,
  canUndo,
  canRedo,
}: FlowCanvasProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  // 新增：获取历史记录是否打开的状态
  const { historyState } = useHistory();
  const isHistoryOpen = historyState.isOpen;

  return (
    <div className="h-full w-full relative react-flow-academic">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodesChange={onNodesChange}
        fitView
        preventScrolling={true}
        maxZoom={4}
        minZoom={0.1}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#e5e7eb"
          gap={24}
          size={1}
        />

        {/* 顶部工具栏 */}
        <Panel 
          position="top-left" 
          className="!m-0 pointer-events-auto !z-[100]"
        >
          <div className="ml-5 mt-4 flex items-center gap-3">
            {/* 独立的图谱记录圈圈 */}
            <HistoryTrigger 
              module="tree" 
              title="图谱记录" 
              // 强制覆盖 absolute，改为 flex 布局中的相对元素，并美化圆圈
              className="relative! top-0! left-0! bg-white/90 backdrop-blur-md shadow-sm border border-slate-200 hover:bg-slate-50 flex items-center justify-center !m-0"
            />

            {/* 撤销/前进/缩放等工具栏 */}
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md shadow-sm border border-slate-200 rounded-full px-2 py-1">
              <button
                onClick={onUndo}
                disabled={!canUndo}
              role="button"
              aria-label="撤销操作"
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  canUndo ? "hover:bg-slate-50" : "opacity-40 cursor-not-allowed"
                }`}
                title="撤销 (Ctrl+Z)"
              >
                <Undo2 size={14} className="text-black" />
              </button>

              <button
                onClick={onRedo}
                disabled={!canRedo}
              role="button"
              aria-label="重做操作"
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  canRedo ? "hover:bg-slate-50" : "opacity-40 cursor-not-allowed"
                }`}
                title="前进 (Ctrl+Y / Ctrl+Shift+Z)"
              >
                <Redo2 size={14} className="text-black" />
              </button>

              <button
                onClick={onDelete}
              role="button"
              aria-label="删除节点"
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-slate-50"
                title="删除节点 (Delete)"
              >
                <Trash2 size={14} className="text-black" />
              </button>

              <div className="w-px h-5 bg-slate-200" />

              <button
              onClick={() => zoomIn()}
              role="button"
              aria-label="放大视图"
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-slate-50"
                title="放大"
              >
                <Plus size={14} className="text-black" />
              </button>

              <button
              onClick={() => zoomOut()}
              role="button"
              aria-label="缩小视图"
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-slate-50"
                title="缩小"
              >
                <Minus size={14} className="text-black" />
              </button>

              <button
              onClick={() => fitView()}
              role="button"
              aria-label="适应屏幕"
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-slate-50"
                title="适应屏幕"
              >
                <Maximize size={13} className="text-black" />
              </button>
            </div>
          </div>
        </Panel>

      </ReactFlow>
    </div>
  );
}
