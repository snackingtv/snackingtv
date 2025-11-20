'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SplashScreenProps {
  onAnimationEnd: () => void;
}

export function SplashScreen({ onAnimationEnd }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onAnimationEnd();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex items-center justify-center bg-background splash-animation'
      )}
    >
      <div className="relative flex h-48 w-48 items-center justify-center">
        {/* Pulsating rings */}
        <div className="pulsating-ring"></div>
        <div className="pulsating-ring" style={{ animationDelay: '1s' }}></div>
        <div className="pulsating-ring" style={{ animationDelay: '2s' }}></div>
        {/* Central dot */}
        <div className="absolute h-4 w-4 rounded-full bg-primary"></div>
      </div>
    </div>
  );
}
