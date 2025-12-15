'use client';

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Wrench,
  Loader2,
  ChevronDown,
  ChevronUp,
  Image,
  Video,
  Box,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type { AgentStatus } from '@/types/agent';
import { isImageUrl, isVideoUrl, isModelUrl, truncate } from '@/lib/utils';

interface ToolNodeData {
  toolName: string;
  status: AgentStatus;
  input: Record<string, unknown>;
  inputUrls: string[];
  output: string | null;
  outputUrl: string | null;
  outputId?: string;
  error: string | null;
}

// Industrial status styling for tools
const STATUS_STYLES: Record<AgentStatus, {
  border: string;
  accent: string;
  icon: React.ReactNode;
}> = {
  pending: {
    border: 'border-[#4b5563]',
    accent: '#4b5563',
    icon: <AlertCircle className="w-3.5 h-3.5 text-[#4b5563]" />,
  },
  running: {
    border: 'border-[#FF4400]',
    accent: '#FF4400',
    icon: <Loader2 className="w-3.5 h-3.5 text-[#FF4400] animate-spin" />,
  },
  complete: {
    border: 'border-[#10b981]',
    accent: '#10b981',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />,
  },
  error: {
    border: 'border-[#ef4444]',
    accent: '#ef4444',
    icon: <XCircle className="w-3.5 h-3.5 text-[#ef4444]" />,
  },
};

function ToolNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as ToolNodeData;
  const { toolName, status, input, output, outputUrl, outputId, error } = nodeData;
  const [expanded, setExpanded] = useState(false);

  const styles = STATUS_STYLES[status] || STATUS_STYLES.pending;

  const renderPreview = () => {
    if (!outputUrl) return null;

    if (isImageUrl(outputUrl)) {
      return (
        <div className="relative group">
          <img
            src={outputUrl}
            alt="Output"
            className="w-full h-32 object-cover"
          />
          <a
            href={outputUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 p-1.5 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="w-3 h-3 text-white" />
          </a>
        </div>
      );
    }

    if (isVideoUrl(outputUrl)) {
      return (
        <div className="relative group h-32 bg-[#08090a]">
          <video
            src={outputUrl}
            className="w-full h-full object-cover"
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Video className="w-8 h-8 text-white/60" />
          </div>
          <a
            href={outputUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 p-1.5 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="w-3 h-3 text-white" />
          </a>
        </div>
      );
    }

    if (isModelUrl(outputUrl)) {
      return (
        <div className="relative group h-32 bg-[#08090a] flex flex-col items-center justify-center">
          <Box className="w-10 h-10 text-[#4b5563] mb-2" />
          <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">.glb model</span>
          <a
            href={outputUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 p-1.5 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="w-3 h-3 text-white" />
          </a>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`
      w-[220px]
      bg-[#111214]
      border ${styles.border}
      transition-all duration-300
      cursor-pointer hover:border-[#FF4400]/50
    `}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-[#2a2d31] !border-2 !border-[#4b5563] !-left-1"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a2d31]">
        <div className="flex items-center gap-2">
          <Wrench className="w-3.5 h-3.5 text-[#6b7280]" />
          <span className="text-xs font-medium text-[#e8e9ea]">
            {toolName?.replace(/_/g, ' ')}
          </span>
        </div>
        {styles.icon}
      </div>

      {/* Output Preview */}
      {outputUrl && (
        <div className="border-b border-[#2a2d31]">
          {renderPreview()}
        </div>
      )}

      {/* Output ID Badge */}
      {outputId && (
        <div className="px-3 py-2 border-b border-[#2a2d31]">
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono bg-[#FF4400]/10 text-[#FF4400] border border-[#FF4400]/20">
            {outputId}
          </span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-3 py-2 bg-[#ef4444]/5 border-b border-[#ef4444]/20">
          <p className="text-[10px] text-[#ef4444] leading-relaxed line-clamp-2">
            {error}
          </p>
        </div>
      )}

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-[10px] text-[#6b7280] hover:bg-[#191b1e] transition-colors"
      >
        <span className="uppercase tracking-wider">Details</span>
        {expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {expanded && (
        <div className="px-3 py-3 border-t border-[#2a2d31] max-h-48 overflow-auto">
          {/* Input Section */}
          <div className="mb-3">
            <div className="text-[9px] uppercase tracking-wider text-[#6b7280] mb-1.5">
              Input
            </div>
            <pre className="text-[10px] text-[#9ca3af] whitespace-pre-wrap break-all leading-relaxed bg-[#08090a] p-2 border border-[#2a2d31]">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>

          {/* Output Section */}
          {output && (
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#6b7280] mb-1.5">
                Output
              </div>
              <p className="text-[10px] text-[#9ca3af] break-all leading-relaxed">
                {truncate(output, 300)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-[#2a2d31] !border-2 !border-[#4b5563] !-right-1"
      />
    </div>
  );
}

export const ToolNode = memo(ToolNodeComponent);
