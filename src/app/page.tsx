'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { M3uChannel } from '@/lib/m3u-parser';
import { SplashScreen } from '@/components/splash-screen';
import { Button } from '@/components/ui/button';
import { Plus, Search, Trash2, User as UserIcon } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { ChannelCarousel } from '@/components/channel-carousel';
import { AddChannelSheetContent, AuthSheetContent } from '@/components/video-card';
import { Input } from '@/components/ui/input';
import { WithId } from '@/firebase/firestore/use-collection';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { deleteChannels } from '@/firebase/firestore/deletions';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { DeviceStorageButton } from '@/components/device-storage';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Link from 'next/link';
import { topYoutubeVideos, YouTubeVideo } from '@/app/lib/youtube-videos';

export default function HomePage() {
  const { t, getCategoryIcon } = useTranslation();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isManaging, setIsManaging] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  useEffect(() => {
    const storedFavorites = localStorage.getItem('favoriteChannels');
    if (storedFavorites) {
      setFavoriteChannels(JSON.parse(storedFavorites));
    }
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
    return userChannels?.filter(c => favoriteChannels.includes(c.url)) || [];
  }, [userChannels, favoriteChannels]);
  
  const handleToggleSelect = (channelId: string) => {
    setSelectedChannels(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(channelId)) {
        newSelection.delete(channelId);
      } else {
        newSelection.add(channelId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = (channels: WithId<M3uChannel>[]) => {
    const allIds = channels.map(c => c.id);
    const allSelected = allIds.every(id => selectedChannels.has(id));

    if (allSelected) {
      setSelectedChannels(new Set());
    } else {
      setSelectedChannels(new Set(allIds));
    }
  };
  
  const handleDeleteSelected = async () => {
    if (!firestore || selectedChannels.size === 0) return;
    try {
      await deleteChannels(firestore, Array.from(selectedChannels));
      toast({
        title: t('channelsDeletedTitle'),
        description: t('channelsDeletedDescription', { count: selectedChannels.size }),
      });
      setSelectedChannels(new Set());
      setIsManaging(false);
    } catch (error) {
      console.error("Error deleting channels: ", error);
      toast({
        variant: "destructive",
        title: t('deleteErrorTitle'),
        description: t('deleteErrorDescription'),
      });
    }
  };

  if (isAppLoading) {
    return <SplashScreen version="v5" />;
  }

  const allChannelsToShow = searchTerm ? filteredChannels : userChannels || [];

  return (
    <main className="h-screen w-screen overflow-y-auto bg-background text-foreground">
      <div className="flex h-full w-full flex-col app-fade-in">
        <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-10 w-10 flex-shrink-0">
                  <UserIcon size={20} className="drop-shadow-lg" />
                </Button>
              </SheetTrigger>
              <AuthSheetContent />
            </Sheet>
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
               <div className="space-y-3 px-4 md:px-8">
                     <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
                       <CarouselContent>
                         <CarouselItem className="basis-1/4 sm:basis-1/5 md:basis-1/6 lg:basis-1/8 xl:basis-1/10">
                           <AddChannelSheetContent user={user} isUserLoading={isUserLoading} trigger={
                              <div className="group">
                                <Card className="overflow-hidden border border-zinc-700 bg-zinc-900 aspect-[16/9] transition-transform duration-200 ease-in-out group-hover:scale-105 flex items-center justify-center">
                                  <Plus className="h-8 w-8 text-zinc-400 group-hover:text-white" />
                                </Card>
                                <p className="mt-2 text-xs text-zinc-300 truncate group-hover:text-white text-center">
                                  {t('addChannel')}
                                </p>
                              </div>
                            } />
                         </CarouselItem>
                         <CarouselItem className="basis-1/4 sm:basis-1/5 md:basis-1/6 lg:basis-1/8 xl:basis-1/10">
                           <DeviceStorageButton />
                         </CarouselItem>
                         {[...Array(3)].map((_, index) => (
                          <CarouselItem key={`placeholder-${index}`} className="basis-1/4 sm:basis-1/5 md:basis-1/6 lg:basis-1/8 xl:basis-1/10">
                              <div className="group">
                                  <Card className="overflow-hidden border border-zinc-700 bg-zinc-900 aspect-[16/9] transition-transform duration-200 ease-in-out group-hover:scale-105 flex items-center justify-center">
                                  </Card>
                                  <p className="mt-2 text-xs text-zinc-300 truncate invisible">
                                    -
                                  </p>
                              </div>
                          </CarouselItem>
                         ))}
                       </CarouselContent>
                       <CarouselPrevious className="hidden md:flex" />
                       <CarouselNext className="hidden md:flex" />
                     </Carousel>
                   </div>
              {isManaging ? (
                <div className="px-4 md:px-8">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <Checkbox 
                          id="select-all" 
                          onCheckedChange={() => handleSelectAll(allChannelsToShow)} 
                          checked={allChannelsToShow.length > 0 && allChannelsToShow.every(c => selectedChannels.has(c.id))}
                          aria-label={t('selectAll')}
                        />
                        <label htmlFor="select-all" className="text-sm font-medium">{t('selectAll')} ({selectedChannels.size}/{allChannelsToShow.length})</label>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => {
                          setIsManaging(false);
                          setSelectedChannels(new Set());
                        }}
                      >
                        {t('done')}
                      </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {allChannelsToShow.map(channel => (
                      <div key={channel.id} className="relative group" onClick={() => handleToggleSelect(channel.id)}>
                        <Card className="overflow-hidden border border-zinc-700 bg-zinc-900 aspect-[16/9] transition-transform duration-200 ease-in-out group-hover:scale-105 cursor-pointer">
                          <div className="p-0 flex items-center justify-center h-full relative">
                            <Image
                              src={channel.logo}
                              alt={channel.name}
                              width={100}
                              height={100}
                              className="object-contain w-full h-full p-2"
                              onError={(e) => e.currentTarget.src = `https://picsum.photos/seed/${channel.name}/100/100`}
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100">
                               <Checkbox checked={selectedChannels.has(channel.id)} className="h-6 w-6 border-2" />
                            </div>
                            {selectedChannels.has(channel.id) && (
                               <div className="absolute inset-0 border-2 border-primary rounded-lg bg-primary/20 flex items-center justify-center">
                                   <Checkbox checked={true} className="h-6 w-6 border-2" />
                               </div>
                            )}
                          </div>
                        </Card>
                        <p className="mt-2 text-xs text-zinc-300 truncate group-hover:text-white">
                          {channel.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : searchTerm ? (
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
                    onManageClick={() => setIsManaging(true)}
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

          <div className="space-y-3 px-4 md:px-8 mt-8">
            <div className="text-lg font-bold text-white">Top 10 YouTube Videos</div>
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
              <CarouselContent>
                {topYoutubeVideos.map((video) => (
                  <CarouselItem key={video.id} className="basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6 xl:basis-1/8">
                    <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                      <div className="group">
                        <Card className="overflow-hidden border border-zinc-700 bg-zinc-900 aspect-[16/9] transition-transform duration-200 ease-in-out group-hover:scale-105">
                          <CardContent className="p-0 flex items-center justify-center h-full">
                            <Image
                              src={video.thumbnailUrl}
                              alt={video.title}
                              width={1920}
                              height={1080}
                              className="object-cover w-full h-full"
                            />
                          </CardContent>
                        </Card>
                        <p className="mt-2 text-xs text-zinc-300 truncate group-hover:text-white">
                          {video.title}
                        </p>
                      </div>
                    </a>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          </div>
        </div>
        
        {isManaging && (
          <div className="sticky bottom-0 z-30 p-4 bg-background/80 backdrop-blur-sm border-t border-border/50 flex justify-center">
              <Button variant="destructive" onClick={handleDeleteSelected} disabled={selectedChannels.size === 0}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('deleteSelected', { count: selectedChannels.size })}
              </Button>
          </div>
        )}

      </div>
    </main>
  );
}

    