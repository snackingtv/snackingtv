'use client';

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { HardDrive } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Helper to read file as data URL
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function DeviceStorageButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataURL(file);
      // Store file info in sessionStorage to pass to the player page
      sessionStorage.setItem('localVideoFile', JSON.stringify({ name: file.name, dataUrl }));
      router.push('/player');
    } catch (error) {
      console.error("Error reading file:", error);
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
