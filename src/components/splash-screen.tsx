'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import Lottie from 'lottie-react';

interface SplashScreenProps {
  onAnimationEnd: () => void;
  version?: 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7' | 'v8' | 'v9' | 'v10';
}

export function SplashScreen({ onAnimationEnd, version = 'v10' }: SplashScreenProps) {
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
    version === 'v7' ? 'splash-animation-v7' :
    version === 'v8' ? 'splash-animation-v8' :
    version === 'v9' ? 'splash-animation-v9' :
    version === 'v10' ? 'splash-animation-v10' :
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
      {version === 'v7' && (
        <div className="shutter-container">
          <div className="shutter-panel"></div>
          <div className="shutter-panel"></div>
          <div className="shutter-panel"></div>
          <div className="shutter-panel"></div>
        </div>
      )}
      {version === 'v8' && (
        <div className="gemini-star-container">
          <div className="gemini-star"></div>
        </div>
      )}
      {version === 'v9' && (
        <div className="focus-in-container">
          <div className="focus-in-ring"></div>
        </div>
      )}
      {version === 'v10' && (
        <div className="colorful-spinner-container">
          <div className="colorful-petal" style={{ transform: 'rotate(0deg)', '--color': '#ef4444' } as React.CSSProperties}></div>
          <div className="colorful-petal" style={{ transform: 'rotate(72deg)', '--color': '#3b82f6' } as React.CSSProperties}></div>
          <div className="colorful-petal" style={{ transform: 'rotate(144deg)', '--color': '#22c55e' } as React.CSSProperties}></div>
          <div className="colorful-petal" style={{ transform: 'rotate(216deg)', '--color': '#eab308' } as React.CSSProperties}></div>
          <div className="colorful-petal" style={{ transform: 'rotate(288deg)', '--color': '#f97316' } as React.CSSProperties}></div>
        </div>
      )}
    </div>
  );
}
