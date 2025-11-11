'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoFeed } from '@/components/video-feed';
import { SplashScreen } from '@/components/splash-screen';
import { BottomNavigation } from '@/components/bottom-navigation';
import { M3uChannel } from '@/lib/m3u-parser';
import { Video } from '@/lib/videos';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, where, serverTimestamp } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';
import { Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { SearchSheetContent, SettingsSheetContent } from '@/components/video-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


export default function Home() {
  const { t } = useTranslation();
  const [showSplash, setShowSplash] = useState(true);
  const [activeChannel, setActiveChannel] = useState<M3uChannel | Video | null>(null);

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoInputRef = useRef<HTMLInputElement>(null);
  const [localVideoItem, setLocalVideoItem] = useState<Video | null>(null);

  const [showClock, setShowClock] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [sharedChannel, setSharedChannel] = useState<M3uChannel | null>(null);
  const [isShareDialogVisible, setIsShareDialogVisible] = useState(false);
  
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]);
  
  const [feedItems, setFeedItems] = useState<Video[]>([]);
  const [filteredFeedItems, setFilteredFeedItems] = useState<Video[]>([]);

  useEffect(() => {
    const storedFavorites = localStorage.getItem('favoriteChannels');
    if (storedFavorites) {
      setFavoriteChannels(JSON.parse(storedFavorites));
    }
  }, []);

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
    const params = new URLSearchParams(window.location.search);
    const channelData = params.get('channel');
    if (channelData) {
      try {
        const decodedChannel = JSON.parse(atob(channelData));
        setSharedChannel(decodedChannel);
        setIsShareDialogVisible(true);
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error("Failed to parse shared channel data:", e);
      }
    }
  }, []);

  const handleConfirmShare = async () => {
    if (!sharedChannel) return;

    if (user && firestore) {
      const channelWithId = {
        ...sharedChannel,
        userId: user.uid,
        addedAt: serverTimestamp(),
      };
      await addDocumentNonBlocking(collection(firestore, 'user_channels'), channelWithId);
      toast({
        title: t('channelAddedTitle', { count: 1 }),
        description: `${sharedChannel.name} ${t('wasAdded')}`,
      });
    } else {
       toast({
          variant: 'destructive',
          title: t('notLoggedInTitle'),
          description: t('notLoggedInToSave'),
        });
    }
    setSharedChannel(null);
    setIsShareDialogVisible(false);
  };

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

  const userChannelsQuery = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, 'user_channels'), where('userId', '==', user.uid))
        : null,
    [user, firestore]
  );

  const { data: userChannels } = useCollection<M3uChannel>(userChannelsQuery);

  useEffect(() => {
    const combinedFeed: Video[] = [];
    const combinedUrls = new Set<string>();

    if (userChannels) {
      userChannels.forEach((channel) => {
        if (!combinedUrls.has(channel.url)) {
          combinedFeed.push({
            id: channel.id || channel.url,
            url: channel.url,
            title: channel.name,
            author: channel.group || 'IPTV',
            avatarId: 'iptv_placeholder',
          });
          combinedUrls.add(channel.url);
        }
      });
    }
    setFeedItems(combinedFeed);
  }, [userChannels]);

  useEffect(() => {
    const newFilteredItems = feedItems.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFeedItems(newFilteredItems);
  }, [feedItems, searchTerm]);

  const handleActiveIndexChange = useCallback((index: number) => {
    if (localVideoItem) {
        setActiveChannel(localVideoItem);
    } else if (filteredFeedItems[index]) {
        setActiveChannel(filteredFeedItems[index]);
    } else {
        setActiveChannel(null);
    }
  }, [filteredFeedItems, localVideoItem]);


  const handleChannelSelect = useCallback((channel: M3uChannel | Video) => {
    setLocalVideoItem(null); 
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
      setActiveChannel(newVideoItem);
    }
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
        <TooltipProvider>
           <input
            type="file"
            ref={localVideoInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="hidden"
          />
          <h1 className="sr-only">SnackingTV - A vertical video feed</h1>

          {isShareDialogVisible && sharedChannel && (
            <AlertDialog open onOpenChange={setIsShareDialogVisible}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('importSharedChannelTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('importSharedChannelDescription', { channelName: sharedChannel.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsShareDialogVisible(false)}>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmShare}>{t('add')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {showClock && (
            <div className="absolute top-4 left-4 z-30 font-headline text-2xl font-bold text-white" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
              {currentTime}
            </div>
          )}

          <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
              <Sheet>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-12 w-12 flex-shrink-0">
                        <Search size={28} className="drop-shadow-lg"/>
                      </Button>
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('searchChannels')}</p>
                  </TooltipContent>
                </Tooltip>
                <SearchSheetContent onSearch={setSearchTerm} searchTerm={searchTerm} />
              </Sheet>
              
              <Sheet>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-12 w-12 flex-shrink-0">
                        <Settings size={28} className="drop-shadow-lg"/>
                      </Button>
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('settings')}</p>
                  </TooltipContent>
                </Tooltip>
                <SettingsSheetContent showClock={showClock} onToggleClock={handleToggleClock} />
              </Sheet>
          </div>

          <VideoFeed 
            feedItems={filteredFeedItems}
            onChannelSelect={handleChannelSelect} 
            activeChannel={activeChannel}
            onProgressUpdate={setProgress}
            onDurationChange={setDuration}
            activeVideoRef={activeVideoRef}
            localVideoItem={localVideoItem}
            favoriteChannels={favoriteChannels}
            onToggleFavorite={handleToggleFavorite}
            onActiveIndexChange={handleActiveIndexChange}
          />

          {(activeChannel || localVideoItem) && (
             <div className="absolute bottom-[4.5rem] left-4 right-4 z-30 text-white font-bold text-sm text-left pointer-events-none" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
                <p>{localVideoItem?.title || activeChannel?.title}</p>
            </div>
          )}

          <div 
            data-progress-bar
            className="fixed bottom-16 left-0 right-0 h-1 cursor-pointer group z-20"
            onClick={handleProgressClick}
          >
            <Progress
              value={progress}
              className="h-full group-hover:h-2.5 transition-all duration-200"
            />
          </div>
          <BottomNavigation 
            onChannelSelect={handleChannelSelect}
            addedChannels={userChannels || []}
            favoriteChannelUrls={favoriteChannels}
            onLocalVideoSelect={handleLocalVideoSelect}
            user={user}
            isUserLoading={isUserLoading}
            onToggleFavorite={handleToggleFavorite}
          />
        </TooltipProvider>
      )}
    </main>
  );
}
