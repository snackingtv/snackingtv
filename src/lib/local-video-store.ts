'use client';

import { create } from 'zustand';

interface LocalVideoState {
  file: File | null;
  setFile: (file: File) => void;
  clearFile: () => void;
}

export const useLocalVideoStore = create<LocalVideoState>((set) => ({
  file: null,
  setFile: (file) => set({ file }),
  clearFile: () => set({ file: null }),
}));
