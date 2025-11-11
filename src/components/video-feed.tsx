'use client';

import React, { useCallback, useEffect, useState, MutableRefObject } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';
import type { Video } from '@/lib/videos';
import { VideoCard } from '@/components/video-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { M3uChannel } from '@/lib/m3u-parser';

interface VideoFeedProps {
  feedItems: Video[];
  onChannelSelect: (channel: M3uChannel | Video) => void;
  activeChannel: M3uChannel | Video | null;
  onProgressUpdate: (progress: number) => void;
  onDurationChange: (duration: number) => void;
  activeVideoRef: MutableRefObject<HTMLVideoElement | null>;
  localVideoItem: Video | null;
  favoriteChannels: string[];
  onToggleFavorite: (channelUrl: string) => void;
  onActiveIndexChange: (index: number) => void;
}


export function VideoFeed({ 
  feedItems, 
  onChannelSelect, 
  activeChannel, 
  onProgressUpdate, 
  onDurationChange, 
  activeVideoRef, 
  localVideoItem, 
  favoriteChannels, 
  onToggleFavorite,
  onActiveIndexChange 
}: VideoFeedProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: false,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  
  useEffect(() => {
    if (activeChannel && emblaApi) {
        const index = feedItems.findIndex(item => item.url === activeChannel.url);
        if (index !== -1 && index !== emblaApi.selectedScrollSnap()) {
            emblaApi.scrollTo(index, true); // Use instant scroll
        }
    }
  }, [activeChannel, emblaApi, feedItems]);

  const onCarouselSelect = useCallback((emblaApi: EmblaCarouselType) => {
    const newIndex = emblaApi.selectedScrollSnap();
    setActiveIndex(newIndex);
    onActiveIndexChange(newIndex);
  }, [onActiveIndexChange]);

  useEffect(() => {
    if (!emblaApi) return;
    
    // Initial sync
    const newIndex = emblaApi.selectedScrollSnap();
    setActiveIndex(newIndex);
    onActiveIndexChange(newIndex);

    emblaApi.on('select', onCarouselSelect);
    emblaApi.on('reInit', onCarouselSelect);

    return () => {
      if (emblaApi) {
        emblaApi.off('select', onCarouselSelect);
        emblaApi.off('reInit', onCarouselSelect);
      }
    };
  }, [emblaApi, onCarouselSelect, onActiveIndexChange]);


  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [feedItems, emblaApi]);

  const currentFeed = localVideoItem ? [localVideoItem] : feedItems;

  const placeholderVideo: Video = {
    id: 'placeholder',
    url: '',
    title: '',
    author: '',
    avatarId: 'iptv_placeholder'
  };

  const displayFeed = currentFeed.length > 0 ? currentFeed : [placeholderVideo];
  
  useEffect(() => {
    if (currentFeed.length === 0 && !localVideoItem) {
      setActiveIndex(0);
      onActiveIndexChange(0);
    }
  }, [currentFeed, localVideoItem, onActiveIndexChange]);


  return (
    <>
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex flex-col h-full">
          {displayFeed.map((video, index) => (
              <div className="flex-[0_0_100%] min-h-0 relative" key={video.id}>
                <VideoCard
                  video={video}
                  isActive={index === activeIndex}
                  onAddChannels={() => {}}
                  onChannelSelect={onChannelSelect}
                  addedChannels={[]}
                  isFavorite={favoriteChannels.includes(video.url)}
                  onToggleFavorite={onToggleFavorite}
                  onProgressUpdate={onProgressUpdate}
                  onDurationChange={onDurationChange}
                  activeVideoRef={activeVideoRef}
                  localVideoItem={video === localVideoItem ? localVideoItem : null}
                />
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
