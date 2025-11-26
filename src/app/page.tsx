'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { M3uChannel } from '@/lib/m3u-parser';
import { SplashScreen } from '@/components/splash-screen';
import { Button } from '@/components/ui/button';
import { Home, Menu, Plus, Search } from 'lucide-react';
import { AppSidebar } from '@/components/sidebar';
import { useTranslation } from '@/lib/i18n';
import { ChannelCarousel } from '@/components/channel-carousel';
import { AddChannelSheetContent } from '@/components/video-card';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function HomePage() {
  const { t } = useTranslation();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredChannels = useMemo(() => {
    if (!userChannels) return [];
    if (!searchTerm) return userChannels;
    return userChannels.filter(channel => 
      channel.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [userChannels, searchTerm]);

  const favoriteChannelItems = useMemo(() => {
    const favorites = userChannels?.filter(c => favoriteChannels.includes(c.url)) || [];
    if (!searchTerm) return favorites;
    return favorites.filter(channel => 
      channel.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [userChannels, favoriteChannels, searchTerm]);


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
        <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
          <div className="flex items-center gap-2">
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
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t('searchChannels')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto pt-8">
          {userChannels && userChannels.length > 0 ? (
            <div className="space-y-8">
              {searchTerm ? (
                <ChannelCarousel
                  title={`${t('searchPlaceholder')} "${searchTerm}"`}
                  channels={filteredChannels}
                />
              ) : (
                <>
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
                </>
              )}
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
