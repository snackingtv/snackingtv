'use client';

import { useState, useEffect } from 'react';
import { VideoFeed } from '@/components/video-feed';
import { SplashScreen } from '@/components/splash-screen';

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      {showSplash ? (
        <SplashScreen onAnimationEnd={() => setShowSplash(false)} />
      ) : (
        <>
          <h1 className="sr-only">SnackingTV - A vertical video feed</h1>
          <VideoFeed />
        </>
      )}
    </main>
  );
}
