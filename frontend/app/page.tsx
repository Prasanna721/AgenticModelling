'use client';

import { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useAgentStore } from '@/store/agentStore';
import { ChatInput } from '@/components/ChatInput';
import { AgentFlowTab } from '@/components/tabs/AgentFlowTab';
import { DeliverablesTab } from '@/components/tabs/DeliverablesTab';
import { Workflow, Package } from 'lucide-react';

type TabType = 'flow' | 'deliverables';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('flow');
  const sessionStatus = useAgentStore((state) => state.sessionStatus);

  // Auto-switch to deliverables when session completes
  useEffect(() => {
    if (sessionStatus === 'complete') {
      setActiveTab('deliverables');
    }
  }, [sessionStatus]);

  // Reset to flow tab when a new session starts
  useEffect(() => {
    if (sessionStatus === 'running') {
      setActiveTab('flow');
    }
  }, [sessionStatus]);

  return (
    <ReactFlowProvider>
      <main className="h-screen flex flex-col bg-[#08090a]">
        {/* Header / Tab bar */}
        <div className="flex items-center border-b border-[#2a2d31] bg-[#111214] shrink-0">
          {/* Tabs */}
          <div className="flex">
            <button
              onClick={() => setActiveTab('flow')}
              className={`
                flex items-center gap-2.5
                px-6 py-4
                text-xs uppercase tracking-wider
                transition-colors
                border-b-2 -mb-[1px]
                ${activeTab === 'flow'
                  ? 'text-[#FF4400] border-[#FF4400] bg-[#FF4400]/5'
                  : 'text-[#6b7280] border-transparent hover:text-[#9ca3af]'
                }
              `}
            >
              <Workflow className="w-4 h-4" />
              Agent Flow
            </button>

            <button
              onClick={() => setActiveTab('deliverables')}
              className={`
                flex items-center gap-2.5
                px-6 py-4
                text-xs uppercase tracking-wider
                transition-colors
                border-b-2 -mb-[1px]
                ${activeTab === 'deliverables'
                  ? 'text-[#FF4400] border-[#FF4400] bg-[#FF4400]/5'
                  : 'text-[#6b7280] border-transparent hover:text-[#9ca3af]'
                }
              `}
            >
              <Package className="w-4 h-4" />
              Deliverables
              {sessionStatus === 'complete' && (
                <div className="w-2 h-2 bg-[#10b981]" />
              )}
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Session status (right side) */}
          <div className="px-6 flex items-center gap-3 text-xs">
            <div className={`
              w-2 h-2
              ${sessionStatus === 'running' ? 'bg-[#FF4400] pulse-live' : ''}
              ${sessionStatus === 'complete' ? 'bg-[#10b981]' : ''}
              ${sessionStatus === 'error' ? 'bg-[#ef4444]' : ''}
              ${sessionStatus === 'idle' ? 'bg-[#4b5563]' : ''}
            `} />
            <span className="text-[#6b7280] uppercase tracking-wider">
              {sessionStatus === 'idle' && 'Ready'}
              {sessionStatus === 'running' && 'Running'}
              {sessionStatus === 'complete' && 'Complete'}
              {sessionStatus === 'error' && 'Error'}
            </span>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'flow' && <AgentFlowTab />}
          {activeTab === 'deliverables' && <DeliverablesTab />}

          {/* Chat input overlay */}
          <ChatInput />
        </div>
      </main>
    </ReactFlowProvider>
  );
}
