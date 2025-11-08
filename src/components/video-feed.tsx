'use client';

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';
import { videos as initialVideos, type Video } from '@/lib/videos';
import { VideoCard } from '@/components/video-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { M3uChannel } from '@/lib/m3u-parser';

export function VideoFeed() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: true,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedItems, setFeedItems] = useState<Video[]>(initialVideos);
  const [addedChannels, setAddedChannels] = useState<M3uChannel[]>([]);
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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
      id: Date.now() + index, // Simple unique ID generation
      url: channel.url,
      title: channel.name,
      author: channel.group || 'IPTV',
      avatarId: 'iptv_placeholder', // A generic or random avatar
    }));

    setAddedChannels(prev => [...prev, ...uniqueNewChannels]);
    setFeedItems(prev => [...prev, ...newFeedItems]);
  }, [feedItems]);

  // When a new item is added, we need to reinitialize Embla
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [feedItems.length, emblaApi]);

  const handleChannelSelect = useCallback((channel: M3uChannel) => {
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
        {filteredFeedItems.map((video, index) => (
          <div className="flex-[0_0_100%] min-h-0 relative" key={`${video.url}-${index}`}>
            <VideoCard
              video={video}
              isActive={index === activeIndex}
              onAddChannels={handleAddChannels}
              onChannelSelect={handleChannelSelect}
              addedChannels={addedChannels}
              isFavorite={favoriteChannels.includes(video.url)}
              onToggleFavorite={handleToggleFavorite}
              onSearch={setSearchTerm}
              searchTerm={searchTerm}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
