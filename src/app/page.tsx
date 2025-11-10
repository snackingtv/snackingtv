'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoFeed } from '@/components/video-feed';
import { SplashScreen } from '@/components/splash-screen';
import { BottomNavigation } from '@/components/bottom-navigation';
import { M3uChannel } from '@/lib/m3u-parser';
import { Video } from '@/lib/videos';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [feedItems, setFeedItems] = useState<Video[]>([]);
  const [activeChannel, setActiveChannel] = useState<M3uChannel | Video | null>(null);

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoInputRef = useRef<HTMLInputElement>(null);
  const [localVideoItem, setLocalVideoItem] = useState<Video | null>(null);

  const userChannelsQuery = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, 'user_channels'), where('userId', '==', user.uid))
        : null,
    [user, firestore]
  );

  const { data: userChannels } = useCollection<M3uChannel>(userChannelsQuery);

  const handleAddChannels = useCallback((newChannels: M3uChannel[]) => {
    const existingUrls = new Set(feedItems.map(item => item.url));
    const uniqueNewChannels = newChannels.filter(c => !existingUrls.has(c.url));
    
    if (uniqueNewChannels.length === 0) return;

    const newFeedItems: Video[] = uniqueNewChannels.map((channel, index) => ({
      id: Date.now() + index,
      url: channel.url,
      title: channel.name,
      author: channel.group || 'IPTV',
      avatarId: 'iptv_placeholder',
    }));

    setFeedItems(prev => [...prev, ...newFeedItems]);
  }, [feedItems]);

  const handleChannelSelect = useCallback((channel: M3uChannel | Video) => {
    setLocalVideoItem(null); // Switch away from local video if a channel is selected
    setActiveChannel(channel);
  }, []);

  const handleLocalVideoSelect = () => {
    localVideoInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newVideoItem: Video = {
        id: `local-${file.name}-${Date.now()}`,
        url: file as any,
        title: file.name,
        author: 'Local File',
        avatarId: 'local_file_placeholder'
      };
      setLocalVideoItem(newVideoItem);
      setActiveChannel(null); // De-select any active channel
    }
    // Reset file input to allow selecting the same file again
    if(event.target) event.target.value = '';
  };


  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const videoElement = activeVideoRef.current;
    if (!progressBar || !videoElement || isNaN(videoElement.duration)) return;
  
    const rect = progressBar.getBoundingClientRect();
    const clickPositionX = e.clientX - rect.left;
    const clickRatio = clickPositionX / rect.width;
    const newTime = clickRatio * videoElement.duration;
  
    videoElement.currentTime = newTime;
    setProgress(clickRatio * 100);
  };
  
  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      {showSplash ? (
        <SplashScreen onAnimationEnd={() => setShowSplash(false)} />
      ) : (
        <>
           <input
            type="file"
            ref={localVideoInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="hidden"
          />
          <h1 className="sr-only">SnackingTV - A vertical video feed</h1>
          <VideoFeed 
            onChannelSelect={handleChannelSelect} 
            activeChannel={activeChannel}
            onProgressUpdate={setProgress}
            onDurationChange={setDuration}
            activeVideoRef={activeVideoRef}
            localVideoItem={localVideoItem}
          />
          <div 
            data-progress-bar
            className="fixed bottom-16 left-0 right-0 h-2.5 cursor-pointer group z-20"
            onClick={handleProgressClick}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <Progress
              value={progress}
              className="h-1 group-hover:h-2.5 transition-all duration-200"
            />
          </div>
          <BottomNavigation 
            onAddChannels={handleAddChannels}
            onChannelSelect={handleChannelSelect}
            addedChannels={userChannels || []}
            onLocalVideoSelect={handleLocalVideoSelect}
            user={user}
            isUserLoading={isUserLoading}
          />
        </>
      )}
    </main>
  );
}
