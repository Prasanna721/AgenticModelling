'use client';

import { useState } from 'react';
import { X, File, Image, Video, Box, Loader2 } from 'lucide-react';
import type { UploadedFile } from '@/types/agent';
import { formatFileSize } from '@/lib/utils';
import { deleteFile } from '@/lib/firebase';

interface FileChipsProps {
  files: UploadedFile[];
  onRemove: (fileId: string) => void;
}

export function FileChips({ files, onRemove }: FileChipsProps) {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleRemove = async (file: UploadedFile) => {
    setDeletingIds((prev) => new Set(prev).add(file.id));
    try {
      await deleteFile(file.storagePath);
      onRemove(file.id);
    } catch (error) {
      console.error('Failed to delete file:', error);
      onRemove(file.id);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  };

  const getIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-3.5 h-3.5" />;
    if (type.startsWith('video/')) return <Video className="w-3.5 h-3.5" />;
    if (type.includes('model') || type.includes('glb') || type.includes('gltf'))
      return <Box className="w-3.5 h-3.5" />;
    return <File className="w-3.5 h-3.5" />;
  };

  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => {
        const isDeleting = deletingIds.has(file.id);
        return (
          <div
            key={file.id}
            className="
              group
              flex items-center gap-2.5
              bg-[#111214]
              border border-[#2a2d31]
              px-3 py-2
              hover:border-[#3d4147]
              transition-colors
            "
          >
            {/* Icon */}
            <span className="text-[#6b7280]">{getIcon(file.type)}</span>

            {/* File name */}
            <span className="text-xs text-[#e8e9ea] max-w-[140px] truncate">
              {file.name}
            </span>

            {/* File size */}
            <span className="text-[10px] text-[#4b5563]">
              {formatFileSize(file.size)}
            </span>

            {/* Remove button */}
            <button
              onClick={() => handleRemove(file)}
              disabled={isDeleting}
              className="
                p-1
                text-[#4b5563]
                hover:text-[#FF4400]
                hover:bg-[#FF4400]/10
                transition-colors
                disabled:opacity-50
              "
              aria-label="Remove file"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
