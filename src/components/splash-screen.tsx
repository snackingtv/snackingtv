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
    }, 3000); // Duration of the animation

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex items-center justify-center bg-black splash-animation'
      )}
    >
      <h1 className="text-5xl font-fredoka text-white splash-text-animation">
        SnackingTV
      </h1>
    </div>
  );
}
