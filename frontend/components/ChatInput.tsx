'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Send, Loader2, Upload, Square, Paperclip } from 'lucide-react';
import { uploadFile } from '@/lib/firebase';
import { useSessionStore } from '@/store/sessionStore';
import { useAgentStore } from '@/store/agentStore';
import { useAgentWebSocket } from '@/hooks/useAgentWebSocket';
import { FileChips } from './FileChips';
import type { UploadedFile } from '@/types/agent';

export function ChatInput() {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { uploadedFiles, addFile, removeFile, isUploading, setUploading, clearFiles } =
    useSessionStore();
  const { sessionStatus, reset: resetAgentStore } = useAgentStore();
  const { isConnected, startAgentSession, cancelSession } = useAgentWebSocket();

  const isRunning = sessionStatus === 'running';
  const canSubmit = isConnected && !isRunning && input.trim().length > 0 && !isSubmitting;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (isRunning) return;

      setUploading(true);
      for (const file of acceptedFiles) {
        try {
          const result = await uploadFile(file, 'attachments');
          const uploadedFile: UploadedFile = {
            id: crypto.randomUUID(),
            name: result.name,
            url: result.url,
            size: result.size,
            type: result.type,
            storagePath: `attachments/${Date.now()}_${result.name}`,
          };
          addFile(uploadedFile);
        } catch (error) {
          console.error('Failed to upload file:', error);
        }
      }
      setUploading(false);
    },
    [addFile, setUploading, isRunning]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    disabled: isRunning,
  });

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    resetAgentStore();

    const fileUrls = uploadedFiles.map((f) => f.url);
    const success = startAgentSession(input.trim(), fileUrls);

    if (success) {
      setInput('');
      clearFiles();
    }

    setIsSubmitting(false);
  };

  const handleCancel = () => {
    cancelSession();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
      {/* File chips - above input */}
      {uploadedFiles.length > 0 && (
        <div className="mb-3">
          <FileChips files={uploadedFiles} onRemove={removeFile} />
        </div>
      )}

      {/* Main input container */}
      <div
        {...getRootProps()}
        className={`
          relative
          bg-[#111214]
          border
          ${isDragActive ? 'border-[#FF4400]' : 'border-[#2a2d31]'}
          shadow-lg shadow-black/40
          transition-all duration-200
        `}
      >
        <input {...getInputProps()} />

        {/* Drag overlay */}
        {isDragActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#FF4400]/5 border-2 border-dashed border-[#FF4400] z-10">
            <div className="flex items-center gap-3 text-[#FF4400]">
              <Upload className="w-5 h-5" />
              <span className="text-sm font-medium">Drop files here</span>
            </div>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-3 p-3">
          {/* Attachment button */}
          <button
            onClick={open}
            disabled={isRunning || isUploading}
            className="flex-shrink-0 p-2.5 text-[#6b7280] hover:text-[#9ca3af] hover:bg-[#191b1e] transition-colors disabled:opacity-40"
            aria-label="Attach files"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRunning ? 'Processing...' : 'Describe your task...'}
            disabled={isRunning}
            rows={1}
            className="
              flex-1
              bg-transparent
              text-[#e8e9ea]
              placeholder:text-[#4b5563]
              py-2.5
              outline-none
              resize-none
              disabled:opacity-40
              min-h-[44px]
              max-h-[200px]
              text-sm
              leading-relaxed
            "
          />

          {/* Submit/Cancel button */}
          {isRunning ? (
            <button
              onClick={handleCancel}
              className="
                flex-shrink-0
                flex items-center justify-center
                w-10 h-10
                bg-[#ef4444]
                text-white
                hover:bg-[#dc2626]
                transition-colors
              "
              aria-label="Stop"
            >
              <Square className="w-4 h-4" fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="
                flex-shrink-0
                flex items-center justify-center
                w-10 h-10
                bg-[#FF4400]
                text-white
                hover:bg-[#e63e00]
                disabled:opacity-30
                disabled:cursor-not-allowed
                transition-colors
              "
              aria-label="Send"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-[#2a2d31] bg-[#08090a]">
          {/* Connection indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 ${isConnected ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
            <span className="text-[10px] uppercase tracking-wider text-[#6b7280]">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Processing indicator */}
          {isRunning && (
            <>
              <div className="w-px h-3 bg-[#2a2d31]" />
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 text-[#FF4400] animate-spin" />
                <span className="text-[10px] uppercase tracking-wider text-[#FF4400]">
                  Processing
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
