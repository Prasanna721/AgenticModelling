/**
 * Agent and UI type definitions
 */

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  storagePath: string;
}

export type AgentStatus = 'pending' | 'running' | 'complete' | 'error';

export interface Agent {
  id: string;
  type: string;
  description: string;
  status: AgentStatus;
  parentId: string | null;
  messages: string[];
  timestamp: string;
}

export interface ToolCall {
  id: string;
  agentId: string;
  toolName: string;
  status: AgentStatus;
  input: Record<string, unknown>;
  inputUrls: string[];
  output: string | null;
  outputUrl: string | null;
  error: string | null;
  timestamp: string;
}

export type DeliverableType = 'image' | '3d_model' | 'video' | 'other';

export interface Deliverable {
  type: DeliverableType;
  output_id: string;
  url: string;
  label: string;
}

export type SessionStatus = 'idle' | 'connecting' | 'running' | 'complete' | 'error';

export interface SessionSummary {
  deliverables?: Record<string, string>;
  session_dir?: string;
  tool_calls?: number;
  duration_ms?: number;
}
