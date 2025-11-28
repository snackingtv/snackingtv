'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { SplashScreen } from '@/components/splash-screen';
import { M3uChannel } from '@/lib/m3u-parser';
import { Video } from '@/lib/videos';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Settings, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { SettingsSheetContent, VideoCard } from '@/components/video-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import ReactPlayer from 'react-player';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocalVideoStore } from '@/lib/local-video-store';

function PlayerPageContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  const [activeChannel, setActiveChannel] = useState<M3uChannel | Video | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const activeVideoRef = useRef<ReactPlayer | null>(null);

  const [showClock, setShowClock] = useState(true);
  const [showCaptions, setShowCaptions] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [videoQuality, setVideoQuality] = useState<string>('auto');
  const [qualityLevels, setQualityLevels] = useState<{ label: string; level: number }[]>([]);
  const [bufferSize, setBufferSize] = useState<string>('auto');
  
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]);
  
  const [localVideoItem, setLocalVideoItem] = useState<Video | null>(null);
  
  const localVideoFile = useLocalVideoStore((state) => state.file);
  const clearLocalVideoFile = useLocalVideoStore((state) => state.clearFile);

  const userChannelsQuery = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, 'user_channels'), where('userId', '==', user.uid))
        : null,
    [user, firestore]
  );
  
  const { data: userChannels, isLoading: areChannelsLoading } = useCollection<M3uChannel>(userChannelsQuery);
  
  let isAppLoading = isUserLoading || areChannelsLoading;
  
  if (localVideoFile) {
    isAppLoading = false;
  }

  useEffect(() => {
    if (localVideoFile) {
      setLocalVideoItem({
        id: `local-${localVideoFile.name}`,
        url: localVideoFile,
        title: localVideoFile.name,
        author: 'Local',
        avatarId: 'avatar5',
      });
    }
  }, [localVideoFile]);


  useEffect(() => {
    const storedFavorites = localStorage.getItem('favoriteChannels');
    if (storedFavorites) {
      setFavoriteChannels(JSON.parse(storedFavorites));
    }
    const storedShowCaptions = localStorage.getItem('showCaptions');
    setShowCaptions(storedShowCaptions === 'true');

    const storedQuality = localStorage.getItem('videoQuality');
    if (storedQuality) {
      setVideoQuality(storedQuality);
    }
    
    const storedBufferSize = localStorage.getItem('bufferSize');
    if (storedBufferSize) {
      setBufferSize(storedBufferSize);
    }
  }, []);

  useEffect(() => {
    const channelData = searchParams.get('channel');
    if (channelData) {
      try {
        const decodedChannel = JSON.parse(decodeURIComponent(channelData));
        setActiveChannel(decodedChannel);
      } catch (e) {
        console.error("Failed to parse channel data from URL:", e);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (localVideoItem) {
      setActiveChannel(localVideoItem);
    }
  }, [localVideoItem]);
  
  const handleBufferSizeChange = (size: string) => {
    setBufferSize(size);
    localStorage.setItem('bufferSize', size);
    toast({
      title: t('bufferSizeChangedTitle'),
      description: t('bufferSizeChangedDescription', { size: t(`buffer_${size}`) }),
    });
  };

  const handleQualityChange = (quality: string) => {
    setVideoQuality(quality);
    localStorage.setItem('videoQuality', quality);
    toast({
      title: t('qualityChangedTitle'),
      description: t('qualityChangedDescription', { quality: quality === 'auto' ? t('auto') : quality }),
    });
  };

  const handleToggleFavorite = useCallback((channelUrl: string) => {
    setFavoriteChannels(prev => {
      const newFavorites = prev.includes(channelUrl)
        ? prev.filter(url => url !== channelUrl)
        : [...prev, channelUrl];
      localStorage.setItem('favoriteChannels', JSON.stringify(newFavorites));
      return newFavorites;
    });
  }, []);

  useEffect(() => {
    const storedValue = localStorage.getItem('showClock');
    setShowClock(storedValue === null ? true : storedValue === 'true');
  }, []);

  const handleToggleClock = () => {
    setShowClock(prev => {
      const newValue = !prev;
      localStorage.setItem('showClock', String(newValue));
      return newValue;
    });
  };

  const handleToggleCaptions = () => {
    setShowCaptions(prev => {
      const newValue = !prev;
      localStorage.setItem('showCaptions', String(newValue));
      return newValue;
    });
  };

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCurrentTime(timeString);
    };
    
    updateClock();
    const timerId = setInterval(updateClock, 1000);

    return () => clearInterval(timerId);
  }, []);

  if (isAppLoading) {
    return <SplashScreen version="v5" />;
  }
  
  const placeholderVideo: Video = {
    id: 'placeholder',
    url: '',
    title: t('noChannelsAvailable'),
    author: 'Tivio',
    avatarId: 'iptv_placeholder'
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
        <div className="h-full w-full app-fade-in">
          <TooltipProvider>
            <h1 className="sr-only">Tivio - A vertical video feed</h1>

            <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
                <Link href="/" onClick={clearLocalVideoFile}>
                  <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-10 w-10 flex-shrink-0">
                    <Home size={20} />
                  </Button>
                </Link>
            </div>

            <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-10 w-10 flex-shrink-0"
                      onClick={() => window.location.reload()}
                    >
                      <RefreshCw size={20} className="drop-shadow-lg" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Neu laden</p>
                  </TooltipContent>
                </Tooltip>

                <Sheet>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-10 w-10 flex-shrink-0">
                          <Settings size={20} className="drop-shadow-lg"/>
                        </Button>
                      </SheetTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('settings')}</p>
                    </TooltipContent>
                  </Tooltip>
                  <SettingsSheetContent
                    showClock={showClock}
                    onToggleClock={handleToggleClock}
                    showCaptions={showCaptions}
                    onToggleCaptions={handleToggleCaptions}
                    quality={videoQuality}
                    onQualityChange={handleQualityChange}
                    qualityLevels={qualityLevels}
                    bufferSize={bufferSize}
                    onBufferSizeChange={handleBufferSizeChange}
                  />
                </Sheet>
                
                {showClock && (
                  <div className="z-30 font-light text-2xl text-white" style={{ fontFamily: 'Inter, sans-serif', textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
                    {currentTime}
                  </div>
                )}
            </div>

            <div className="h-full w-full">
              <VideoCard
                video={activeChannel || placeholderVideo}
                isActive={true}
                addedChannels={userChannels || []}
                isFavorite={!!activeChannel?.url && typeof activeChannel.url === 'string' && favoriteChannels.includes(activeChannel.url)}
                onToggleFavorite={handleToggleFavorite}
                onProgressUpdate={setProgress}
                onDurationChange={setDuration}
                activeVideoRef={activeVideoRef}
                localVideoItem={localVideoItem}
                showCaptions={showCaptions}
                videoQuality={videoQuality}
                onQualityLevelsChange={setQualityLevels}
                bufferSize={bufferSize}
              />
            </div>
            
          </TooltipProvider>
        </div>
    </main>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<SplashScreen version="v5" />}>
      <PlayerPageContent />
    </Suspense>
  );
}
