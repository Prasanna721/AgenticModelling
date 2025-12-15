'use client';

import { useState, useMemo } from 'react';
import { X, Maximize2, Check, AlertTriangle, Loader2, ChevronDown, ChevronRight, ExternalLink, Copy } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import type { ToolCall } from '@/types/agent';

interface SidePanelProps {
  nodeId: string;
  onClose: () => void;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#FF4400]/20 text-[#FF4400] text-xs rounded">
          <Loader2 className="w-3 h-3 animate-spin" />
          Running
        </span>
      );
    case 'complete':
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
          <Check className="w-3 h-3" />
          Complete
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
          <AlertTriangle className="w-3 h-3" />
          Error
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded">
          Pending
        </span>
      );
  }
}

function ToolCallItem({ toolCall, isExpanded, onToggle }: {
  toolCall: ToolCall;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || url.includes('generated') || url.includes('firebase');

  return (
    <div className="border border-[#2a2d31] rounded-lg overflow-hidden">
      {/* Tool Call Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#16181a] hover:bg-[#1c1e20] transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-[#737373]" /> : <ChevronRight className="w-4 h-4 text-[#737373]" />}
          <span className="text-sm font-medium text-[#e8e9ea]">{toolCall.toolName}</span>
        </div>
        <StatusBadge status={toolCall.status} />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#2a2d31] bg-[#111214]">
          {/* Input Section */}
          <div className="p-3 border-b border-[#2a2d31]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-[#737373]">Input</span>
              <button
                onClick={() => copyToClipboard(JSON.stringify(toolCall.input, null, 2))}
                className="text-xs text-[#737373] hover:text-[#e8e9ea] flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs text-[#9ca3af] bg-[#0a0b0c] p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>

          {/* Input URLs */}
          {toolCall.inputUrls && toolCall.inputUrls.length > 0 && (
            <div className="p-3 border-b border-[#2a2d31]">
              <span className="text-xs uppercase tracking-wider text-[#737373] block mb-2">Input URLs</span>
              <div className="space-y-2">
                {toolCall.inputUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {isImageUrl(url) && (
                      <button
                        onClick={() => setFullscreenImage(url)}
                        className="relative group"
                      >
                        <img
                          src={url}
                          alt="Input"
                          className="w-16 h-16 object-cover rounded border border-[#2a2d31]"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity">
                          <Maximize2 className="w-4 h-4 text-white" />
                        </div>
                      </button>
                    )}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#FF4400] hover:underline flex items-center gap-1 truncate max-w-[200px]"
                    >
                      {url.split('/').pop()}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output Section */}
          {toolCall.output && (
            <div className="p-3 border-b border-[#2a2d31]">
              <span className="text-xs uppercase tracking-wider text-[#737373] block mb-2">Output</span>
              <pre className="text-xs text-[#9ca3af] bg-[#0a0b0c] p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                {typeof toolCall.output === 'string' ? toolCall.output : JSON.stringify(toolCall.output, null, 2)}
              </pre>
            </div>
          )}

          {/* Output URL with Image Preview */}
          {toolCall.outputUrl && (
            <div className="p-3">
              <span className="text-xs uppercase tracking-wider text-[#737373] block mb-2">Result</span>
              <div className="flex items-start gap-3">
                {isImageUrl(toolCall.outputUrl) && (
                  <button
                    onClick={() => setFullscreenImage(toolCall.outputUrl!)}
                    className="relative group flex-shrink-0"
                  >
                    <img
                      src={toolCall.outputUrl}
                      alt="Output"
                      className="w-24 h-24 object-cover rounded border border-[#2a2d31]"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity">
                      <Maximize2 className="w-5 h-5 text-white" />
                    </div>
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <a
                    href={toolCall.outputUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#FF4400] hover:underline flex items-center gap-1"
                  >
                    Open Result
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-xs text-[#737373] mt-1 truncate">
                    {toolCall.outputUrl}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Section */}
          {toolCall.error && (
            <div className="p-3 bg-red-500/10 border-t border-red-500/20">
              <span className="text-xs uppercase tracking-wider text-red-400 block mb-1">Error</span>
              <p className="text-xs text-red-300">{toolCall.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={fullscreenImage}
            alt="Fullscreen preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export function SidePanel({ nodeId, onClose }: SidePanelProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const agents = useAgentStore((state) => state.agents);
  const toolCalls = useAgentStore((state) => state.toolCalls);
  const nodes = useAgentStore((state) => state.nodes);

  // Determine if this is an agent or tool node
  const isAgentNode = nodeId.startsWith('agent-');
  const isToolNode = nodeId.startsWith('tool-');

  // Get node data
  const node = useMemo(() => nodes.find((n) => n.id === nodeId), [nodes, nodeId]);

  // Get agent data
  const agentId = isAgentNode ? nodeId.replace('agent-', '') : null;
  const agent = agentId ? agents.get(agentId) : null;

  // Get tool call data
  const toolId = isToolNode ? nodeId.replace('tool-', '') : null;
  const toolCall = toolId ? toolCalls.get(toolId) : null;

  // Get tool calls for an agent
  const agentToolCalls = useMemo(() => {
    if (!agentId) return [];
    return Array.from(toolCalls.values()).filter((tc) => tc.agentId === agentId);
  }, [agentId, toolCalls]);

  const toggleTool = (toolId: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  };

  if (!node) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-[400px] bg-[#111214] border-l border-[#2a2d31] shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d31] bg-[#16181a]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#e8e9ea]">
            {isAgentNode ? (node.data as any).agentType : (node.data as any).toolName}
          </span>
          <StatusBadge status={(node.data as any).status} />
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#2a2d31] transition-colors"
        >
          <X className="w-5 h-5 text-[#737373]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Agent View */}
        {isAgentNode && (
          <>
            {/* Description */}
            <div>
              <span className="text-xs uppercase tracking-wider text-[#737373] block mb-1">Description</span>
              <p className="text-sm text-[#9ca3af]">
                {(node.data as any).description || 'No description available'}
              </p>
            </div>

            {/* Agent ID */}
            {agent && (
              <div>
                <span className="text-xs uppercase tracking-wider text-[#737373] block mb-1">Agent ID</span>
                <p className="text-sm text-[#e8e9ea] font-mono">{agent.id}</p>
              </div>
            )}

            {/* Tool Calls */}
            {agentToolCalls.length > 0 && (
              <div>
                <span className="text-xs uppercase tracking-wider text-[#737373] block mb-2">
                  Tool Calls ({agentToolCalls.length})
                </span>
                <div className="space-y-2">
                  {agentToolCalls.map((tc) => (
                    <ToolCallItem
                      key={tc.id}
                      toolCall={tc}
                      isExpanded={expandedTools.has(tc.id)}
                      onToggle={() => toggleTool(tc.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {agent && agent.messages.length > 0 && (
              <div>
                <span className="text-xs uppercase tracking-wider text-[#737373] block mb-2">Messages</span>
                <div className="space-y-2">
                  {agent.messages.map((msg, idx) => (
                    <div key={idx} className="text-xs text-[#9ca3af] bg-[#16181a] p-2 rounded">
                      {msg}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Tool View */}
        {isToolNode && toolCall && (
          <ToolCallItem
            toolCall={toolCall}
            isExpanded={true}
            onToggle={() => {}}
          />
        )}
      </div>
    </div>
  );
}
