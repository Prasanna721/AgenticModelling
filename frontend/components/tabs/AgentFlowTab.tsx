'use client';

import { AgentFlow } from '../AgentFlow';
import { useAgentStore } from '@/store/agentStore';
import { Workflow, Loader2, AlertTriangle } from 'lucide-react';

export function AgentFlowTab() {
  const sessionStatus = useAgentStore((state) => state.sessionStatus);
  const sessionError = useAgentStore((state) => state.sessionError);
  const nodes = useAgentStore((state) => state.nodes);

  // Empty state
  if (sessionStatus === 'idle' && nodes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        {/* Icon container */}
        <div className="w-16 h-16 bg-[#111214] border border-[#2a2d31] flex items-center justify-center mb-6">
          <Workflow className="w-7 h-7 text-[#4b5563]" />
        </div>

        {/* Title */}
        <h2 className="text-base font-medium text-[#e8e9ea] mb-2 tracking-tight">
          Ready to Execute
        </h2>

        {/* Description */}
        <p className="text-sm text-[#6b7280] text-center max-w-sm leading-relaxed">
          Enter a task description to start the agent workflow.
          <br />
          Drag and drop files to include attachments.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <AgentFlow />

      {/* Status overlays */}
      {sessionStatus === 'running' && (
        <div className="absolute top-4 left-4 flex items-center gap-2.5 bg-[#111214] border border-[#FF4400]/30 px-4 py-2.5 shadow-lg">
          <Loader2 className="w-4 h-4 text-[#FF4400] animate-spin" />
          <span className="text-xs uppercase tracking-wider text-[#FF4400]">
            Processing
          </span>
        </div>
      )}

      {sessionStatus === 'error' && (
        <div className="absolute top-4 left-4 flex items-center gap-2.5 bg-[#111214] border border-[#ef4444]/30 px-4 py-2.5 shadow-lg">
          <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
          <span className="text-xs uppercase tracking-wider text-[#ef4444]">
            Error
          </span>
          {sessionError && (
            <span className="text-xs text-[#9ca3af] ml-2 max-w-xs truncate">
              {sessionError}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
