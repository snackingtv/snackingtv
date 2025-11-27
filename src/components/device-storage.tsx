'use client';

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { HardDrive } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import { useLocalVideoStore } from '@/lib/local-video-store';

export function DeviceStorageButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setLocalVideoFile = useLocalVideoStore((state) => state.setFile);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Set the file in the global store
      setLocalVideoFile(file);
      // Navigate to the player page
      router.push('/player');
    } catch (error) {
      console.error("Error setting local video file:", error);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="video/*"
        className="hidden"
      />
      <div className="group" onClick={handleButtonClick} style={{ cursor: 'pointer' }}>
        <Card className="overflow-hidden border border-zinc-700 bg-zinc-900 aspect-[16/9] transition-transform duration-200 ease-in-out group-hover:scale-105 flex items-center justify-center">
          <HardDrive className="h-8 w-8 text-zinc-400 group-hover:text-white" />
        </Card>
        <p className="mt-2 text-xs text-zinc-300 truncate group-hover:text-white text-center">
          {t('deviceStorage')}
        </p>
      </div>
    </>
  );
}
