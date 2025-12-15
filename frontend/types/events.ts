/**
 * WebSocket event types from the backend orchestrator
 * Reference: /RLI_agent/rli_agent/utils/event_emitter.py
 */

// WebSocket message wrapper
export interface WSMessage {
  type: 'event' | 'connected' | 'error' | 'pong' | 'session_cancelled' | 'info';
  timestamp: string;
  session_id?: string;
  event_type?: EventType;
  data?: EventData;
  client_id?: string;
  message?: string;
}

export type EventType =
  | 'SESSION_STARTED'
  | 'SUBAGENT_SPAWNED'
  | 'TOOL_CALL_START'
  | 'TOOL_CALL_COMPLETE'
  | 'AGENT_MESSAGE'
  | 'AGENT_COMPLETE'
  | 'SESSION_COMPLETE'
  | 'SESSION_ERROR';

export type EventData =
  | SessionStartedData
  | SubagentSpawnedData
  | ToolCallStartData
  | ToolCallCompleteData
  | AgentMessageData
  | AgentCompleteData
  | SessionCompleteData
  | SessionErrorData;

// Event data types
export interface SessionStartedData {
  session_id: string;
  request_preview: string;
}

export interface SubagentSpawnedData {
  agent_id: string;
  agent_type: string;
  description: string;
  parent_id: string | null;
}

export interface ToolCallStartData {
  agent_id: string;
  tool_name: string;
  tool_input_summary: Record<string, unknown>;
  input_urls: string[];
  tool_use_id: string;
}

export interface ToolCallCompleteData {
  agent_id: string;
  tool_name: string;
  tool_use_id: string;
  success: boolean;
  result_url: string | null;
  result: string | null;
  error: string | null;
}

export interface AgentMessageData {
  agent_id: string;
  message: string;
}

export interface AgentCompleteData {
  agent_id: string;
  summary: Record<string, unknown>;
}

export interface SessionCompleteData {
  final_url: string | null;
  duration_ms: number;
  summary: {
    deliverables?: Record<string, string>;
    session_dir?: string;
    tool_calls?: number;
  };
}

export interface SessionErrorData {
  error: string;
}

// Client to server messages
export interface StartSessionMessage {
  type: 'START_SESSION';
  task_brief: string;
  context?: {
    input_files?: string[];
    [key: string]: unknown;
  };
}

export interface CancelSessionMessage {
  type: 'CANCEL_SESSION';
}

export interface PingMessage {
  type: 'PING';
}

export type ClientMessage = StartSessionMessage | CancelSessionMessage | PingMessage;
