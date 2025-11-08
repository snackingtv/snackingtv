'use client';

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';
import { videos as initialVideos, type Video } from '@/lib/videos';
import { VideoCard } from '@/components/video-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { M3uChannel } from '@/lib/m3u-parser';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export function VideoFeed() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: true,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedItems, setFeedItems] = useState<Video[]>([]);
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { user } = useUser();
  const firestore = useFirestore();

  const userChannelsQuery = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, 'user_channels'), where('userId', '==', user.uid))
        : null,
    [user, firestore]
  );
  
  const { data: userChannels } = useCollection<M3uChannel>(userChannelsQuery);
  
  useEffect(() => {
    // We combine initial videos with user channels
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
    const storedFavorites = localStorage.getItem('favoriteChannels');
    if (storedFavorites) {
      setFavoriteChannels(JSON.parse(storedFavorites));
    }
  }, []);

  const handleToggleFavorite = (channelUrl: string) => {
    setFavoriteChannels(prev => {
      const newFavorites = prev.includes(channelUrl)
        ? prev.filter(url => url !== channelUrl)
        : [...prev, channelUrl];
      localStorage.setItem('favoriteChannels', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      if (emblaApi) {
        emblaApi.off('select', onSelect);
        emblaApi.off('reInit', onSelect);
      }
    };
  }, [emblaApi, onSelect]);

  const handleAddChannels = useCallback((newChannels: M3uChannel[]) => {
    // This function is now mainly for local state updates if needed,
    // as persistence is handled by Firestore writes and the useCollection hook.
    const existingUrls = new Set(feedItems.map(item => item.url));
    const uniqueNewChannels = newChannels.filter(c => !existingUrls.has(c.url));
    
    if (uniqueNewChannels.length === 0) return;

    const newFeedItems: Video[] = uniqueNewChannels.map((channel, index) => ({
      id: Date.now() + index, // Simple unique ID generation for local state
      url: channel.url,
      title: channel.name,
      author: channel.group || 'IPTV',
      avatarId: 'iptv_placeholder',
    }));

    setFeedItems(prev => [...prev, ...newFeedItems]);
  }, [feedItems]);

  // When a new item is added, we need to reinitialize Embla
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [feedItems.length, emblaApi]);

  const handleChannelSelect = useCallback((channel: M3uChannel | Video) => {
    const channelIndex = feedItems.findIndex(item => item.url === channel.url);
    if (emblaApi && channelIndex !== -1) {
      emblaApi.scrollTo(channelIndex, false);
    }
  }, [emblaApi, feedItems]);


  const avatarMap = new Map(PlaceHolderImages.map(img => [img.id, img.imageUrl]));
  // Add a generic placeholder for IPTV channels
  avatarMap.set('iptv_placeholder', 'https://picsum.photos/seed/iptv/64/64');

  const filteredFeedItems = feedItems.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="overflow-hidden h-full" ref={emblaRef}>
      <div className="flex flex-col h-full">
        {filteredFeedItems.length > 0 ? (
          filteredFeedItems.map((video, index) => (
            <div className="flex-[0_0_100%] min-h-0 relative" key={`${video.id}-${video.url}`}>
              <VideoCard
                video={video}
                isActive={index === activeIndex}
                onAddChannels={handleAddChannels}
                onChannelSelect={handleChannelSelect}
                addedChannels={userChannels || []}
                isFavorite={favoriteChannels.includes(video.url)}
                onToggleFavorite={handleToggleFavorite}
                onSearch={setSearchTerm}
                searchTerm={searchTerm}
              />
            </div>
          ))
        ) : (
          <div className="flex-[0_0_100%] min-h-0 relative flex items-center justify-center text-center text-white bg-black p-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Willkommen bei SnackingTV</h2>
              <p className="text-lg">Füge Kanäle hinzu, um loszulegen.</p>
              <p className="text-muted-foreground mt-2">Klicke auf das Plus-Symbol (+) oben rechts, um deine erste M3U-Playlist hinzuzufügen.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
    