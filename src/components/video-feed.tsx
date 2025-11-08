'use client';

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';
import type { Video } from '@/lib/videos';
import { VideoCard } from '@/components/video-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { M3uChannel } from '@/lib/m3u-parser';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export function VideoFeed() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: false, // Loop can cause issues with dynamic content
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedItems, setFeedItems] = useState<Video[]>([]);
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [localVideoItem, setLocalVideoItem] = useState<Video | null>(null);

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

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [feedItems, emblaApi]);

  const handleChannelSelect = useCallback((channel: M3uChannel | Video) => {
    const channelIndex = feedItems.findIndex(item => item.url === channel.url);
    if (emblaApi && channelIndex !== -1) {
      emblaApi.scrollTo(channelIndex, false);
      setLocalVideoItem(null); // Deselect local video if a channel is selected
    }
  }, [emblaApi, feedItems]);

  const handleLocalVideoSelect = (file: File) => {
    const newVideoItem: Video = {
      id: `local-${file.name}-${Date.now()}`,
      url: file as any, // This is not a real URL, just placeholder for the blob
      title: file.name,
      author: 'Local File',
      avatarId: 'local_file_placeholder'
    };
    setLocalVideoItem(newVideoItem);
    // If there are other items, we can decide where to show it.
    // For now, let's just make it the only active item.
    if (emblaApi) {
      // This is a bit of a hack. We replace the feed to just show the local video.
      // A better approach might be to insert it and scroll.
    }
  };


  const currentFeed = localVideoItem ? [localVideoItem] : feedItems.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    // When switching from local video back to feed, reset active index if needed
    if (!localVideoItem && emblaApi && activeIndex >= currentFeed.length) {
      setActiveIndex(Math.max(0, currentFeed.length - 1));
    }
  }, [localVideoItem, activeIndex, currentFeed.length, emblaApi]);

  const placeholderVideo: Video = {
    id: 'placeholder',
    url: '',
    title: 'SnackingTV',
    author: 'Add a channel or select a local file',
    avatarId: 'iptv_placeholder'
  };

  const displayFeed = currentFeed.length > 0 ? currentFeed : [placeholderVideo];

  return (
    <div className="overflow-hidden h-full" ref={emblaRef}>
      <div className="flex flex-col h-full">
        {displayFeed.map((video, index) => (
            <div className="flex-[0_0_100%] min-h-0 relative" key={video.id}>
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
                localVideoItem={localVideoItem}
                onLocalVideoSelect={handleLocalVideoSelect}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
    
