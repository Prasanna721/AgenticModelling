'use client';

import { useAgentStore } from '@/store/agentStore';
import { isImageUrl, isVideoUrl, isModelUrl } from '@/lib/utils';
import {
  Download,
  ExternalLink,
  Image,
  Video,
  Box,
  FileText,
  Clock,
  Wrench,
  CheckCircle2,
  Package,
} from 'lucide-react';
import type { Deliverable } from '@/types/agent';

function DeliverableCard({ deliverable }: { deliverable: Deliverable }) {
  const { type, output_id, url, label } = deliverable;

  const getIcon = () => {
    switch (type) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case '3d_model':
        return <Box className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getPreview = () => {
    if (type === 'image' || isImageUrl(url)) {
      return (
        <img
          src={url}
          alt={label}
          className="w-full h-48 object-cover"
        />
      );
    }

    if (type === 'video' || isVideoUrl(url)) {
      return (
        <video
          src={url}
          controls
          className="w-full h-48 object-cover bg-black"
        />
      );
    }

    if (type === '3d_model' || isModelUrl(url)) {
      return (
        <div className="w-full h-48 bg-[#08090a] flex flex-col items-center justify-center">
          <Box className="w-12 h-12 text-[#4b5563] mb-3" />
          <span className="text-[10px] uppercase tracking-wider text-[#6b7280]">
            3D Model (.glb)
          </span>
        </div>
      );
    }

    return (
      <div className="w-full h-48 bg-[#08090a] flex items-center justify-center">
        <FileText className="w-12 h-12 text-[#4b5563]" />
      </div>
    );
  };

  return (
    <div className="bg-[#111214] border border-[#2a2d31] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d31]">
        <span className="text-xs font-mono text-[#FF4400]">{output_id}</span>
        <span className="text-[#6b7280]">{getIcon()}</span>
      </div>

      {/* Preview */}
      <div className="border-b border-[#2a2d31]">
        {getPreview()}
      </div>

      {/* Label */}
      <div className="px-4 py-3 border-b border-[#2a2d31]">
        <p className="text-sm text-[#e8e9ea]">{label}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex items-center gap-2
            px-3 py-2
            text-xs
            text-[#9ca3af]
            bg-[#191b1e]
            border border-[#2a2d31]
            hover:border-[#3d4147]
            hover:text-[#e8e9ea]
            transition-colors
          "
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View
        </a>
        <a
          href={url}
          download
          className="
            flex items-center gap-2
            px-3 py-2
            text-xs
            text-[#9ca3af]
            bg-[#191b1e]
            border border-[#2a2d31]
            hover:border-[#3d4147]
            hover:text-[#e8e9ea]
            transition-colors
          "
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
      </div>
    </div>
  );
}

export function DeliverablesTab() {
  const sessionStatus = useAgentStore((state) => state.sessionStatus);
  const deliverables = useAgentStore((state) => state.deliverables);
  const finalSummary = useAgentStore((state) => state.finalSummary);

  // Empty state - not complete yet
  if (sessionStatus !== 'complete') {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-[#111214] border border-[#2a2d31] flex items-center justify-center mb-6">
          <Package className="w-7 h-7 text-[#4b5563]" />
        </div>
        <h2 className="text-base font-medium text-[#e8e9ea] mb-2 tracking-tight">
          No Deliverables Yet
        </h2>
        <p className="text-sm text-[#6b7280] text-center max-w-sm leading-relaxed">
          Deliverables will appear here once the agent session completes.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
            <h2 className="text-lg font-medium text-[#e8e9ea] tracking-tight">
              Session Complete
            </h2>
          </div>
          <p className="text-sm text-[#6b7280]">
            {deliverables.length} deliverable{deliverables.length !== 1 ? 's' : ''} generated
          </p>
        </div>

        {/* Summary stats */}
        {finalSummary && (
          <div className="flex items-center gap-6 text-xs text-[#6b7280]">
            {finalSummary.duration_ms && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{(finalSummary.duration_ms / 1000).toFixed(1)}s</span>
              </div>
            )}
            {finalSummary.tool_calls && (
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                <span>{finalSummary.tool_calls} tools</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deliverables grid */}
      {deliverables.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {deliverables.map((d) => (
            <DeliverableCard key={d.output_id} deliverable={d} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-[#2a2d31]">
          <p className="text-[#6b7280]">No deliverables were generated.</p>
        </div>
      )}

      {/* Raw summary */}
      {finalSummary && (
        <div className="bg-[#111214] border border-[#2a2d31]">
          <div className="px-4 py-3 border-b border-[#2a2d31]">
            <h3 className="text-xs uppercase tracking-wider text-[#6b7280]">
              Session Summary
            </h3>
          </div>
          <div className="p-4">
            <pre className="text-xs text-[#9ca3af] overflow-auto whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(finalSummary, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
