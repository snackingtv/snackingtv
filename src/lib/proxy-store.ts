'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ProxyState {
  proxyUrl: string | null;
  setProxyUrl: (url: string) => void;
  clearProxyUrl: () => void;
}

export const useProxyStore = create<ProxyState>()(
  persist(
    (set) => ({
      proxyUrl: null,
      setProxyUrl: (url) => set({ proxyUrl: url }),
      clearProxyUrl: () => set({ proxyUrl: null }),
    }),
    {
      name: 'proxy-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
