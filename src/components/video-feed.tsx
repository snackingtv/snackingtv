'use client';

import React, { useCallback, useEffect, useState, MutableRefObject } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';
import type { Video } from '@/lib/videos';
import { VideoCard } from '@/components/video-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { M3uChannel } from '@/lib/m3u-parser';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

interface VideoFeedProps {
  onChannelSelect: (channel: M3uChannel | Video) => void;
  activeChannel: M3uChannel | Video | null;
  onProgressUpdate: (progress: number) => void;
  onDurationChange: (duration: number) => void;
  activeVideoRef: MutableRefObject<HTMLVideoElement | null>;
}


export function VideoFeed({ onChannelSelect, activeChannel, onProgressUpdate, onDurationChange, activeVideoRef }: VideoFeedProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: false, // Loop can cause issues with dynamic content
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedItems, setFeedItems] = useState<Video[]>([]);
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [localVideoItem, setLocalVideoItem] = useState<Video | null>(null);
  const [showClock, setShowClock] = useState(true);

  useEffect(() => {
    const storedValue = localStorage.getItem('showClock');
    // Set to true if not found in storage, otherwise use stored value
    setShowClock(storedValue === null ? true : storedValue === 'true');
  }, []);

  const handleToggleClock = () => {
    setShowClock(prev => {
      const newValue = !prev;
      localStorage.setItem('showClock', String(newValue));
      return newValue;
    });
  };

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
    if (activeChannel && emblaApi) {
        const index = feedItems.findIndex(item => item.url === activeChannel.url);
        if (index !== -1) {
            emblaApi.scrollTo(index, false);
        }
    }
  }, [activeChannel, emblaApi, feedItems]);

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

  const onCarouselSelect = useCallback((emblaApi: EmblaCarouselType) => {
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onCarouselSelect(emblaApi);
    emblaApi.on('select', onCarouselSelect);
    emblaApi.on('reInit', onCarouselSelect);

    return () => {
      if (emblaApi) {
        emblaApi.off('select', onCarouselSelect);
        emblaApi.off('reInit', onCarouselSelect);
      }
    };
  }, [emblaApi, onCarouselSelect]);


  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [feedItems, emblaApi]);

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
    title: '',
    author: '',
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
                onAddChannels={() => {}}
                onChannelSelect={onChannelSelect}
                addedChannels={userChannels || []}
                isFavorite={favoriteChannels.includes(video.url)}
                onToggleFavorite={handleToggleFavorite}
                onSearch={setSearchTerm}
                searchTerm={searchTerm}
                localVideoItem={localVideoItem}
                onLocalVideoSelect={handleLocalVideoSelect}
                showClock={showClock}
                onToggleClock={handleToggleClock}
                onProgressUpdate={onProgressUpdate}
                onDurationChange={onDurationChange}
                activeVideoRef={activeVideoRef}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
