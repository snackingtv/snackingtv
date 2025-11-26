'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { M3uChannel } from '@/lib/m3u-parser';
import { SplashScreen } from '@/components/splash-screen';
import { Button } from '@/components/ui/button';
import { Home, Menu, Plus } from 'lucide-react';
import { AppSidebar } from '@/components/sidebar';
import { useTranslation } from '@/lib/i18n';
import { ChannelCarousel } from '@/components/channel-carousel';
import { AddChannelSheetContent } from '@/components/video-card';
import Link from 'next/link';

export default function HomePage() {
  const { t } = useTranslation();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]);

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
  
  const userChannelsQuery = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, 'user_channels'), where('userId', '==', user.uid))
        : null,
    [user, firestore]
  );
  
  const { data: userChannels, isLoading: areChannelsLoading } = useCollection<M3uChannel>(userChannelsQuery);

  const isAppLoading = isUserLoading || areChannelsLoading;

  const favoriteChannelItems = useMemo(() => {
    return userChannels?.filter(c => favoriteChannels.includes(c.url)) || [];
  }, [userChannels, favoriteChannels]);

  const handleChannelSelect = (channel: M3uChannel) => {
    // This function can be used for other logic if needed,
    // as navigation is handled by Link component now.
  };

  const handleLocalVideoSelect = () => {
    // Logic to handle local video selection if needed in the future
  };

  if (isAppLoading) {
    return <SplashScreen version="v5" />;
  }

  return (
    <main className="h-screen w-screen overflow-y-auto bg-background text-foreground">
      <div className="flex h-full w-full flex-col app-fade-in">
        <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-10 w-10 flex-shrink-0">
                  <Home size={20} />
                </Button>
              </Link>
            <AppSidebar
                onChannelSelect={handleChannelSelect}
                onLocalVideoSelect={handleLocalVideoSelect}
                addedChannels={userChannels || []}
                favoriteChannelUrls={favoriteChannels}
                user={user}
                isUserLoading={isUserLoading}
                onToggleFavorite={handleToggleFavorite}
              />
          </div>
          {/* Top-right controls can be added here if needed */}
        </header>

        <div className="flex-grow overflow-y-auto pt-20">
          {userChannels && userChannels.length > 0 ? (
            <div className="space-y-8">
              {favoriteChannelItems.length > 0 && (
                <ChannelCarousel
                  title={t('favorites')}
                  channels={favoriteChannelItems}
                />
              )}
              <ChannelCarousel
                title={t('allChannels')}
                channels={userChannels}
              />
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-center text-white p-8">
                <div className="p-4 bg-black/50 rounded-lg">
                    <h2 className="text-2xl font-bold mb-4">{t('noChannelsAvailable')}</h2>
                    <AddChannelSheetContent user={user} isUserLoading={isUserLoading} trigger={
                      <Button><Plus className="mr-2 h-4 w-4" /> {t('addChannel')}</Button>
                    } />
                </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
