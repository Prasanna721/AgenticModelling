'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAgentStore } from '@/store/agentStore';
import type {
  WSMessage,
  SubagentSpawnedData,
  ToolCallStartData,
  ToolCallCompleteData,
  AgentMessageData,
  AgentCompleteData,
  SessionCompleteData,
  SessionErrorData,
  ClientMessage,
} from '@/types/events';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765';
const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 30000;

export function useAgentWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  const {
    startSession,
    addAgent,
    startToolCall,
    completeToolCall,
    addAgentMessage,
    completeAgent,
    completeSession,
    setSessionError,
  } = useAgentStore();

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'connected':
            setClientId(message.client_id || null);
            console.log('[WS] Connected with client ID:', message.client_id);
            break;

          case 'pong':
            // Keep-alive response
            break;

          case 'event':
            if (!message.event_type || !message.data) break;

            switch (message.event_type) {
              case 'SESSION_STARTED':
                startSession(message.session_id || '');
                break;

              case 'SUBAGENT_SPAWNED':
                addAgent(message.data as SubagentSpawnedData);
                break;

              case 'TOOL_CALL_START':
                startToolCall(message.data as ToolCallStartData);
                break;

              case 'TOOL_CALL_COMPLETE':
                completeToolCall(message.data as ToolCallCompleteData);
                break;

              case 'AGENT_MESSAGE':
                addAgentMessage(message.data as AgentMessageData);
                break;

              case 'AGENT_COMPLETE':
                completeAgent((message.data as AgentCompleteData).agent_id);
                break;

              case 'SESSION_COMPLETE':
                completeSession(message.data as SessionCompleteData);
                break;

              case 'SESSION_ERROR':
                setSessionError((message.data as SessionErrorData).error);
                break;
            }
            break;

          case 'session_cancelled':
            console.log('[WS] Session cancelled');
            break;

          case 'error':
            console.error('[WS] Error:', message.message);
            setSessionError(message.message || 'Unknown error');
            break;
        }
      } catch (error) {
        console.error('[WS] Failed to parse message:', error);
      }
    },
    [
      startSession,
      addAgent,
      startToolCall,
      completeToolCall,
      addAgentMessage,
      completeAgent,
      completeSession,
      setSessionError,
    ]
  );

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('[WS] Connecting to:', WS_URL);
    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      console.log('[WS] Connected');
      setIsConnected(true);

      // Start ping interval
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
      }
      pingInterval.current = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'PING' }));
        }
      }, PING_INTERVAL);
    };

    ws.current.onmessage = handleMessage;

    ws.current.onclose = () => {
      console.log('[WS] Disconnected');
      setIsConnected(false);
      setClientId(null);

      if (pingInterval.current) {
        clearInterval(pingInterval.current);
      }

      // Auto-reconnect
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      reconnectTimeout.current = setTimeout(() => {
        console.log('[WS] Reconnecting...');
        connect();
      }, RECONNECT_DELAY);
    };

    ws.current.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
    setClientId(null);
  }, []);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('[WS] Cannot send message, not connected');
    return false;
  }, []);

  const startAgentSession = useCallback(
    (taskBrief: string, inputFiles: string[] = []) => {
      return sendMessage({
        type: 'START_SESSION',
        task_brief: taskBrief,
        context: inputFiles.length > 0 ? { input_files: inputFiles } : undefined,
      });
    },
    [sendMessage]
  );

  const cancelSession = useCallback(() => {
    return sendMessage({ type: 'CANCEL_SESSION' });
  }, [sendMessage]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    clientId,
    connect,
    disconnect,
    sendMessage,
    startAgentSession,
    cancelSession,
  };
}
