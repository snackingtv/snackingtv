'use client';

import React, { useCallback, useEffect, useState, MutableRefObject } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel';
import type { Video } from '@/lib/videos';
import { VideoCard } from '@/components/video-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { M3uChannel } from '@/lib/m3u-parser';
import Head from 'next/head';

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
  showCaptions: boolean;
  videoQuality: string;
  onQualityLevelsChange: (levels: { label: string; level: number }[]) => void;
  bufferSize: string;
}

const PRELOAD_COUNT = 1; // Number of items to preload on each side

const usePreload = (emblaApi: EmblaCarouselType | undefined, feedItems: Video[]) => {
  const [preloadUrls, setPreloadUrls] = useState<string[]>([]);

  const updatePreload = useCallback(() => {
    if (!emblaApi) return;

    const engine = emblaApi.internalEngine();
    const scrollSnapList = emblaApi.scrollSnapList();
    if (scrollSnapList.length === 0) return;
    
    const currentIndex = emblaApi.selectedScrollSnap();
    const urlsToPreload = new Set<string>();

    for (let i = 1; i <= PRELOAD_COUNT; i++) {
      const prevIndex = (currentIndex - i + scrollSnapList.length) % scrollSnapList.length;
      const nextIndex = (currentIndex + i) % scrollSnapList.length;
      
      if (feedItems[prevIndex]?.url) urlsToPreload.add(feedItems[prevIndex].url as string);
      if (feedItems[nextIndex]?.url) urlsToPreload.add(feedItems[nextIndex].url as string);
    }
    
    setPreloadUrls(Array.from(urlsToPreload));

  }, [emblaApi, feedItems]);

  useEffect(() => {
    if (!emblaApi) return;

    updatePreload();
    emblaApi.on('select', updatePreload);
    emblaApi.on('reInit', updatePreload);

    return () => {
      emblaApi.off('select', updatePreload);
      emblaApi.off('reInit', updatePreload);
    };
  }, [emblaApi, updatePreload]);

  return preloadUrls;
};


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
  onActiveIndexChange,
  showCaptions,
  videoQuality,
  onQualityLevelsChange,
  bufferSize,
}: VideoFeedProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: false,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const preloadUrls = usePreload(emblaApi, feedItems);
  
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
    url: 'https://cdn.pixabay.com/video/2023/09/16/178065-865626298_large.mp4',
    title: 'Keine Sender verfügbar',
    author: 'SnackingTV',
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
       <Head>
        {preloadUrls.map(url => (
          <link key={url} rel="preload" href={url} as="fetch" crossOrigin="anonymous" />
        ))}
      </Head>
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
                  isFavorite={favoriteChannels.includes(video.url as string)}
                  onToggleFavorite={onToggleFavorite}
                  onProgressUpdate={onProgressUpdate}
                  onDurationChange={onDurationChange}
                  activeVideoRef={activeVideoRef}
                  localVideoItem={video === localVideoItem ? localVideoItem : null}
                  showCaptions={showCaptions}
                  videoQuality={videoQuality}
                  onQualityLevelsChange={onQualityLevelsChange}
                  bufferSize={bufferSize}
                />
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
