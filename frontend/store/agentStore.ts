import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { Agent, ToolCall, Deliverable, SessionStatus, SessionSummary, AgentStatus } from '@/types/agent';
import type {
  SubagentSpawnedData,
  ToolCallStartData,
  ToolCallCompleteData,
  AgentMessageData,
  SessionCompleteData,
} from '@/types/events';
import { getAgentColumn, generateOutputId, extractDeliverables, resetOutputCounters } from '@/lib/utils';

interface AgentState {
  // Session
  sessionId: string | null;
  sessionStatus: SessionStatus;
  sessionError: string | null;

  // Agents and tools
  agents: Map<string, Agent>;
  toolCalls: Map<string, ToolCall>;

  // React Flow data
  nodes: Node[];
  edges: Edge[];

  // URL tracking for dependency edges
  urlToNodeId: Map<string, string>;

  // Column counters for positioning
  columnCounts: Map<number, number>;

  // Deliverables
  deliverables: Deliverable[];
  finalSummary: SessionSummary | null;

  // Selected node for side panel
  selectedNodeId: string | null;

  // Actions
  startSession: (sessionId: string) => void;
  addAgent: (data: SubagentSpawnedData) => void;
  startToolCall: (data: ToolCallStartData) => void;
  completeToolCall: (data: ToolCallCompleteData) => void;
  addAgentMessage: (data: AgentMessageData) => void;
  completeAgent: (agentId: string) => void;
  completeSession: (data: SessionCompleteData) => void;
  setSessionError: (error: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  reset: () => void;
}

const COLUMN_X_OFFSET = 350;
const ROW_Y_OFFSET = 180;
const START_X = 50;
const START_Y = 50;

function calculateNodePosition(column: number, row: number): { x: number; y: number } {
  return {
    x: START_X + column * COLUMN_X_OFFSET,
    y: START_Y + row * ROW_Y_OFFSET,
  };
}

export const useAgentStore = create<AgentState>((set, get) => ({
  // Initial state
  sessionId: null,
  sessionStatus: 'idle',
  sessionError: null,
  agents: new Map(),
  toolCalls: new Map(),
  nodes: [],
  edges: [],
  urlToNodeId: new Map(),
  columnCounts: new Map(),
  deliverables: [],
  finalSummary: null,
  selectedNodeId: null,

  startSession: (sessionId: string) => {
    resetOutputCounters();

    // Create orchestrator node at session start
    const orchestratorNode: Node = {
      id: 'agent-orchestrator',
      type: 'agent',
      position: calculateNodePosition(0, 0),
      data: {
        label: 'orchestrator',
        agentType: 'orchestrator',
        description: 'Main orchestrator coordinating all agents',
        status: 'running',
      },
    };

    const initialColumnCounts = new Map<number, number>();
    initialColumnCounts.set(0, 1); // Orchestrator takes first slot in column 0

    set({
      sessionId,
      sessionStatus: 'running',
      sessionError: null,
      agents: new Map(),
      toolCalls: new Map(),
      nodes: [orchestratorNode],
      edges: [],
      urlToNodeId: new Map(),
      columnCounts: initialColumnCounts,
      deliverables: [],
      finalSummary: null,
      selectedNodeId: null,
    });
  },

  addAgent: (data: SubagentSpawnedData) => {
    set((state) => {
      const column = getAgentColumn(data.agent_type);
      const currentCount = state.columnCounts.get(column) || 0;
      const position = calculateNodePosition(column, currentCount);

      const agent: Agent = {
        id: data.agent_id,
        type: data.agent_type,
        description: data.description,
        status: 'running',
        parentId: data.parent_id,
        messages: [],
        timestamp: new Date().toISOString(),
      };

      const node: Node = {
        id: `agent-${data.agent_id}`,
        type: 'agent',
        position,
        data: {
          label: data.agent_id,
          agentType: data.agent_type,
          description: data.description,
          status: 'running' as AgentStatus,
        },
      };

      // Create edge from parent (use orchestrator if no parent)
      const newEdges: Edge[] = [];
      const parentNodeId = data.parent_id ? `agent-${data.parent_id}` : 'agent-orchestrator';
      newEdges.push({
        id: `edge-${parentNodeId}-agent-${data.agent_id}`,
        source: parentNodeId,
        target: `agent-${data.agent_id}`,
        animated: true,
        style: { stroke: '#525252', strokeWidth: 2 },
      });

      const newAgents = new Map(state.agents);
      newAgents.set(data.agent_id, agent);

      const newColumnCounts = new Map(state.columnCounts);
      newColumnCounts.set(column, currentCount + 1);

      return {
        agents: newAgents,
        nodes: [...state.nodes, node],
        edges: [...state.edges, ...newEdges],
        columnCounts: newColumnCounts,
      };
    });
  },

  startToolCall: (data: ToolCallStartData) => {
    set((state) => {
      const nodeId = `tool-${data.tool_use_id}`;

      // Find the agent's column and add tool to a column to the right
      const agent = state.agents.get(data.agent_id);
      const agentColumn = agent ? getAgentColumn(agent.type) : 2;
      const toolColumn = agentColumn + 0.5; // Place between agent columns

      // Count existing tools for this agent to determine row
      const existingToolsForAgent = Array.from(state.toolCalls.values()).filter(
        (t) => t.agentId === data.agent_id
      ).length;

      const agentNode = state.nodes.find((n) => n.id === `agent-${data.agent_id}`);
      const baseY = agentNode ? agentNode.position.y : START_Y;

      const position = {
        x: START_X + toolColumn * COLUMN_X_OFFSET,
        y: baseY + existingToolsForAgent * 100,
      };

      const toolCall: ToolCall = {
        id: data.tool_use_id,
        agentId: data.agent_id,
        toolName: data.tool_name,
        status: 'running',
        input: data.tool_input_summary,
        inputUrls: data.input_urls,
        output: null,
        outputUrl: null,
        error: null,
        timestamp: new Date().toISOString(),
      };

      const node: Node = {
        id: nodeId,
        type: 'tool',
        position,
        data: {
          toolName: data.tool_name,
          status: 'running' as AgentStatus,
          input: data.tool_input_summary,
          inputUrls: data.input_urls,
          output: null,
          outputUrl: null,
        },
      };

      // Create edges
      const newEdges: Edge[] = [];

      // Edge from parent agent
      newEdges.push({
        id: `edge-agent-${data.agent_id}-tool-${data.tool_use_id}`,
        source: `agent-${data.agent_id}`,
        target: nodeId,
        animated: true,
        style: { stroke: '#FF4400', strokeWidth: 2 },
      });

      // Dependency edges from input URLs
      for (const url of data.input_urls) {
        const sourceNodeId = state.urlToNodeId.get(url);
        if (sourceNodeId) {
          newEdges.push({
            id: `edge-dep-${sourceNodeId}-${nodeId}`,
            source: sourceNodeId,
            target: nodeId,
            style: { stroke: '#22c55e', strokeWidth: 2, strokeDasharray: '5,5' },
            label: 'data',
            labelStyle: { fill: '#737373', fontSize: 10 },
          });
        }
      }

      const newToolCalls = new Map(state.toolCalls);
      newToolCalls.set(data.tool_use_id, toolCall);

      return {
        toolCalls: newToolCalls,
        nodes: [...state.nodes, node],
        edges: [...state.edges, ...newEdges],
      };
    });
  },

  completeToolCall: (data: ToolCallCompleteData) => {
    set((state) => {
      const nodeId = `tool-${data.tool_use_id}`;
      const status: AgentStatus = data.success ? 'complete' : 'error';

      // Update tool call
      const newToolCalls = new Map(state.toolCalls);
      const toolCall = newToolCalls.get(data.tool_use_id);
      if (toolCall) {
        newToolCalls.set(data.tool_use_id, {
          ...toolCall,
          status,
          output: data.result,
          outputUrl: data.result_url,
          error: data.error,
        });
      }

      // Update node
      const nodes = state.nodes.map((node) => {
        if (node.id === nodeId) {
          const outputId = data.result_url ? generateOutputId(data.tool_name, data.result_url) : null;
          return {
            ...node,
            data: {
              ...node.data,
              status,
              output: data.result,
              outputUrl: data.result_url,
              outputId,
              error: data.error,
            },
          };
        }
        return node;
      });

      // Update edges (remove animation)
      const edges = state.edges.map((edge) => {
        if (edge.target === nodeId && edge.animated) {
          return { ...edge, animated: false };
        }
        return edge;
      });

      // Track output URL for dependencies
      const urlToNodeId = new Map(state.urlToNodeId);
      if (data.result_url) {
        urlToNodeId.set(data.result_url, nodeId);
      }

      return { toolCalls: newToolCalls, nodes, edges, urlToNodeId };
    });
  },

  addAgentMessage: (data: AgentMessageData) => {
    set((state) => {
      const newAgents = new Map(state.agents);
      const agent = newAgents.get(data.agent_id);
      if (agent) {
        newAgents.set(data.agent_id, {
          ...agent,
          messages: [...agent.messages, data.message],
        });
      }
      return { agents: newAgents };
    });
  },

  completeAgent: (agentId: string) => {
    set((state) => {
      // Update agent
      const newAgents = new Map(state.agents);
      const agent = newAgents.get(agentId);
      if (agent) {
        newAgents.set(agentId, { ...agent, status: 'complete' });
      }

      // Update node
      const nodes = state.nodes.map((node) => {
        if (node.id === `agent-${agentId}`) {
          return {
            ...node,
            data: { ...node.data, status: 'complete' as AgentStatus },
          };
        }
        return node;
      });

      // Update edges
      const edges = state.edges.map((edge) => {
        if (edge.target === `agent-${agentId}` && edge.animated) {
          return { ...edge, animated: false };
        }
        return edge;
      });

      return { agents: newAgents, nodes, edges };
    });
  },

  completeSession: (data: SessionCompleteData) => {
    const deliverables = extractDeliverables(data.summary);

    set({
      sessionStatus: 'complete',
      deliverables,
      finalSummary: {
        ...data.summary,
        duration_ms: data.duration_ms,
      },
    });
  },

  setSessionError: (error: string) => {
    set({
      sessionStatus: 'error',
      sessionError: error,
    });
  },

  setSelectedNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  reset: () => {
    resetOutputCounters();
    set({
      sessionId: null,
      sessionStatus: 'idle',
      sessionError: null,
      agents: new Map(),
      toolCalls: new Map(),
      nodes: [],
      edges: [],
      urlToNodeId: new Map(),
      columnCounts: new Map(),
      deliverables: [],
      finalSummary: null,
      selectedNodeId: null,
    });
  },
}));
