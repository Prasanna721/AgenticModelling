import { create } from 'zustand';
import type { UploadedFile } from '@/types/agent';

interface SessionState {
  // Input state
  taskBrief: string;
  uploadedFiles: UploadedFile[];
  isUploading: boolean;

  // Actions
  setTaskBrief: (brief: string) => void;
  addFile: (file: UploadedFile) => void;
  removeFile: (fileId: string) => void;
  setUploading: (uploading: boolean) => void;
  clearFiles: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  taskBrief: '',
  uploadedFiles: [],
  isUploading: false,

  setTaskBrief: (brief: string) => {
    set({ taskBrief: brief });
  },

  addFile: (file: UploadedFile) => {
    set((state) => ({
      uploadedFiles: [...state.uploadedFiles, file],
    }));
  },

  removeFile: (fileId: string) => {
    set((state) => ({
      uploadedFiles: state.uploadedFiles.filter((f) => f.id !== fileId),
    }));
  },

  setUploading: (uploading: boolean) => {
    set({ isUploading: uploading });
  },

  clearFiles: () => {
    set({ uploadedFiles: [] });
  },

  reset: () => {
    set({
      taskBrief: '',
      uploadedFiles: [],
      isUploading: false,
    });
  },
}));
