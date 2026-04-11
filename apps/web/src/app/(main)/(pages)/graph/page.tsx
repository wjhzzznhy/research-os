"use client";
import { ReactFlowProvider } from 'reactflow';
import SourceGraphContainer from '@/components/pages/graph/SourceGraphContainer';

//作为入口，只负责“叫出”溯源树组件
export default function GraphPage() {
  // 可以在这里进行服务端数据获取
  return (
    <ReactFlowProvider>
      <SourceGraphContainer />
    </ReactFlowProvider>
  );
}