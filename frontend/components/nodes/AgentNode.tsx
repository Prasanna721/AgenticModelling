'use client';

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Brain,
  FileText,
  Image,
  Box,
  Video,
  Clapperboard,
  Scissors,
  Type,
  Bot,
  Loader2,
  ChevronDown,
  ChevronUp,
  Wrench,
  Check,
  X,
  Clock,
} from 'lucide-react';
import type { AgentStatus, ToolCall } from '@/types/agent';

interface AgentNodeData {
  label: string;
  agentType: string;
  description: string;
  status: AgentStatus;
  toolCalls?: ToolCall[];
}

const AGENT_ICONS: Record<string, React.ReactNode> = {
  orchestrator: <Brain className="w-4 h-4" />,
  planner: <FileText className="w-4 h-4" />,
  'image-generator': <Image className="w-4 h-4" />,
  'image_generator': <Image className="w-4 h-4" />,
  'model-extractor': <Box className="w-4 h-4" />,
  'model_extractor': <Box className="w-4 h-4" />,
  researcher: <FileText className="w-4 h-4" />,
  'video-prompter': <Clapperboard className="w-4 h-4" />,
  'video_prompter': <Clapperboard className="w-4 h-4" />,
  'video-generator': <Video className="w-4 h-4" />,
  'video_generator': <Video className="w-4 h-4" />,
  segmentation: <Scissors className="w-4 h-4" />,
  'font-renderer': <Type className="w-4 h-4" />,
  stitcher: <Box className="w-4 h-4" />,
};

// Industrial status styling
const STATUS_STYLES: Record<AgentStatus, {
  border: string;
  bg: string;
  glow: string;
  indicator: string;
}> = {
  pending: {
    border: 'border-[#4b5563]',
    bg: 'bg-[#111214]',
    glow: '',
    indicator: 'bg-[#4b5563]',
  },
  running: {
    border: 'border-[#FF4400]',
    bg: 'bg-[#111214]',
    glow: 'glow-running',
    indicator: 'bg-[#FF4400]',
  },
  complete: {
    border: 'border-[#10b981]',
    bg: 'bg-[#111214]',
    glow: 'glow-complete',
    indicator: 'bg-[#10b981]',
  },
  error: {
    border: 'border-[#ef4444]',
    bg: 'bg-[#111214]',
    glow: 'glow-error',
    indicator: 'bg-[#ef4444]',
  },
};

// Tool status icon helper
function ToolStatusIcon({ status }: { status: AgentStatus }) {
  switch (status) {
    case 'running':
      return <Loader2 className="w-3 h-3 text-[#FF4400] animate-spin" />;
    case 'complete':
      return <Check className="w-3 h-3 text-[#10b981]" />;
    case 'error':
      return <X className="w-3 h-3 text-[#ef4444]" />;
    default:
      return <Clock className="w-3 h-3 text-[#6b7280]" />;
  }
}

function AgentNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const { label, agentType, description, status, toolCalls } = nodeData;
  const [toolsExpanded, setToolsExpanded] = useState(false);

  const icon = AGENT_ICONS[agentType?.toLowerCase()] || <Bot className="w-4 h-4" />;
  const styles = STATUS_STYLES[status] || STATUS_STYLES.pending;

  return (
    <div className={`
      w-[280px]
      ${styles.bg}
      border-2 ${styles.border}
      ${styles.glow}
      transition-all duration-300
      cursor-pointer hover:border-[#FF4400]/50
    `}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-[#2a2d31] !border-2 !border-[#4b5563] !-left-1.5"
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d31]">
        <div className="flex items-center gap-3">
          {/* Agent Icon */}
          <div className="text-[#9ca3af]">
            {icon}
          </div>

          {/* Agent Label */}
          <span className="text-sm font-medium text-[#e8e9ea] tracking-tight">
            {label}
          </span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {status === 'running' && (
            <Loader2 className="w-3.5 h-3.5 text-[#FF4400] animate-spin" />
          )}
          <div className={`
            w-2.5 h-2.5
            ${styles.indicator}
            ${status === 'running' ? 'pulse-live' : ''}
          `} />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {/* Agent Type Label */}
        <div className="text-[10px] uppercase tracking-wider text-[#6b7280] mb-2">
          {agentType?.replace(/[-_]/g, ' ')}
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-[#9ca3af] leading-relaxed line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {/* Tools Section (collapsible) */}
      {toolCalls && toolCalls.length > 0 && (
        <div className="border-t border-[#2a2d31]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setToolsExpanded(!toolsExpanded);
            }}
            className="w-full px-4 py-2 flex items-center justify-between text-[10px] hover:bg-[#191b1e] transition-colors"
          >
            <span className="flex items-center gap-2 uppercase tracking-wider text-[#6b7280]">
              <Wrench className="w-3 h-3" />
              Tools ({toolCalls.length})
            </span>
            {toolsExpanded ? (
              <ChevronUp className="w-3 h-3 text-[#6b7280]" />
            ) : (
              <ChevronDown className="w-3 h-3 text-[#6b7280]" />
            )}
          </button>

          {toolsExpanded && (
            <div className="px-4 py-2 space-y-1.5 max-h-40 overflow-y-auto bg-[#0a0b0c]">
              {toolCalls.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between text-xs py-1.5 px-2 bg-[#111214] rounded"
                >
                  <span className="text-[#9ca3af] truncate max-w-[180px]" title={tool.toolName}>
                    {tool.toolName.replace(/^mcp__[\w-]+__/, '')}
                  </span>
                  <ToolStatusIcon status={tool.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status Bar (bottom accent) */}
      <div className={`h-1 ${styles.indicator} opacity-60`} />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-[#2a2d31] !border-2 !border-[#4b5563] !-right-1.5"
      />
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
