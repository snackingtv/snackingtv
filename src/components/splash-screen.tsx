'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import Lottie from 'lottie-react';

interface SplashScreenProps {
  onAnimationEnd: () => void;
  version?: 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6';
}

export function SplashScreen({ onAnimationEnd, version = 'v6' }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onAnimationEnd();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  const animationClass = 
    version === 'v2' ? 'splash-animation-v2' :
    version === 'v3' ? 'splash-animation-v3' :
    version === 'v4' ? 'splash-animation-v4' :
    version === 'v5' ? 'splash-animation-v5' :
    version === 'v6' ? 'splash-animation-v6' :
    'splash-animation';

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex items-center justify-center bg-background',
        animationClass
      )}
    >
      {version === 'v1' && (
        <div className="relative flex h-48 w-48 items-center justify-center">
          <div className="pulsating-ring"></div>
          <div className="pulsating-ring" style={{ animationDelay: '1s' }}></div>
          <div className="pulsating-ring" style={{ animationDelay: '2s' }}></div>
          <div className="absolute h-4 w-4 rounded-full bg-primary"></div>
        </div>
      )}
      {version === 'v2' && (
        <div className="scaling-squares-container">
          <div className="scaling-square inset-0"></div>
          <div className="scaling-square inset-4" style={{ animationDelay: '0.2s' }}></div>
          <div className="scaling-square inset-8" style={{ animationDelay: '0.4s' }}></div>
        </div>
      )}
      {version === 'v3' && (
        <div className="gemini-spinner">
          <div className="gemini-spinner-text gemini-text-gradient">SnackingTV</div>
        </div>
      )}
      {version === 'v4' && (
        <div className="bouncing-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      )}
      {version === 'v5' && (
        <div className="loading-bar-container">
          <div className="loading-bar"></div>
        </div>
      )}
      {version === 'v6' && (
        <div className="curtain-container">
          <div className="curtain-panel curtain-left"></div>
          <div className="curtain-panel curtain-right"></div>
        </div>
      )}
    </div>
  );
}
