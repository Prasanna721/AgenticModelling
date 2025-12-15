'use client';

import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAgentStore } from '@/store/agentStore';
import { AgentNode } from './nodes/AgentNode';
import { ToolNode } from './nodes/ToolNode';
import { SidePanel } from './SidePanel';

const nodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
};

const defaultEdgeOptions = {
  style: { strokeWidth: 2 },
  type: 'smoothstep',
};

export function AgentFlow() {
  const storeNodes = useAgentStore((state) => state.nodes);
  const storeEdges = useAgentStore((state) => state.edges);
  const selectedNodeId = useAgentStore((state) => state.selectedNodeId);
  const setSelectedNode = useAgentStore((state) => state.setSelectedNode);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Sync store with local state
  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  const onInit = useCallback(() => {
    console.log('[AgentFlow] Initialized');
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div className="w-full h-full bg-[#f5f5f0] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-[#f5f5f0]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#d0d0c8"
        />
        <Controls
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) => {
            const status = node.data?.status as string;
            switch (status) {
              case 'running':
                return '#FF4400';
              case 'complete':
                return '#10b981';
              case 'error':
                return '#ef4444';
              default:
                return '#4b5563';
            }
          }}
          maskColor="rgba(245, 245, 240, 0.85)"
          style={{
            backgroundColor: '#fff',
            border: '1px solid #d0d0c8',
          }}
        />
      </ReactFlow>

      {/* Side Panel */}
      {selectedNodeId && (
        <SidePanel
          nodeId={selectedNodeId}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
