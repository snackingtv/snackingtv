'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import Lottie from 'lottie-react';

interface SplashScreenProps {
  onAnimationEnd: () => void;
}

export function SplashScreen({ onAnimationEnd }: SplashScreenProps) {

  useEffect(() => {
    const timer = setTimeout(() => {
      onAnimationEnd();
    }, 3000); // Keep the 3-second duration

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex items-center justify-center bg-background splash-animation'
      )}
    >
      <Lottie
        path={'https://lottie.host/85067c82-dbcb-4599-b0b6-9dce7349393f/LlzVjM98tv.lottie'}
        loop={true}
        style={{ width: 300, height: 300 }}
      />
    </div>
  );
}
