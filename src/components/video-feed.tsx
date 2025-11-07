'use client';

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';
import { videos } from '@/lib/videos';
import { VideoCard } from '@/components/video-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function VideoFeed() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: true,
  });
  const [activeIndex, setActiveIndex] = useState(0);

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

  const avatarMap = new Map(PlaceHolderImages.map(img => [img.id, img.imageUrl]));

  return (
    <div className="overflow-hidden h-full" ref={emblaRef}>
      <div className="flex flex-col h-full">
        {videos.map((video, index) => (
          <div className="flex-[0_0_100%] min-h-0 relative" key={video.id}>
            <VideoCard
              video={video}
              avatarUrl={avatarMap.get(video.avatarId) || ''}
              isActive={index === activeIndex}
              isMuted={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
