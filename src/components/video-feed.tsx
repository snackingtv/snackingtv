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
import { BottomNavigation } from '@/components/bottom-navigation';
import { Progress } from '@/components/ui/progress';

interface VideoFeedProps {
  onChannelSelect: (channel: M3uChannel | Video) => void;
  activeChannel: M3uChannel | Video | null;
  onProgressUpdate: (progress: number) => void;
  onDurationChange: (duration: number) => void;
  activeVideoRef: MutableRefObject<HTMLVideoElement | null>;
  localVideoItem: Video | null;
  searchTerm: string;
  onToggleFavorite: (channelUrl: string) => void;
}


export function VideoFeed({ onChannelSelect, activeChannel, onProgressUpdate, onDurationChange, activeVideoRef, localVideoItem, searchTerm, onToggleFavorite }: VideoFeedProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: false, // Loop can cause issues with dynamic content
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedItems, setFeedItems] = useState<Video[]>([]);
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]);

  const { user, isUserLoading } = useUser();
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
    const newFavorites = favoriteChannels.includes(channelUrl)
      ? favoriteChannels.filter(url => url !== channelUrl)
      : [...favoriteChannels, channelUrl];
    setFavoriteChannels(newFavorites);
    localStorage.setItem('favoriteChannels', JSON.stringify(newFavorites));
    // Also call the prop to update parent state
    onToggleFavorite(channelUrl);
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
  
  useEffect(() => {
    // If the feed becomes empty (e.g. search returns no results) and it's not a local video,
    // ensure we reset the active index to 0 for the placeholder.
    if (currentFeed.length === 0 && !localVideoItem) {
      setActiveIndex(0);
    }
  }, [currentFeed, localVideoItem]);


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
                  addedChannels={userChannels || []}
                  isFavorite={favoriteChannels.includes(video.url)}
                  onToggleFavorite={handleToggleFavorite}
                  onProgressUpdate={onProgressUpdate}
                  onDurationChange={onDurationChange}
                  activeVideoRef={activeVideoRef}
                  localVideoItem={video === localVideoItem ? localVideoItem : null}
                />
              </div>
            ))}
        </div>
      </div>
      <div 
        data-progress-bar
        className="fixed bottom-16 left-0 right-0 h-1 cursor-pointer group z-20"
      >
        <Progress
          value={onProgressUpdate as any}
          className="h-full group-hover:h-2.5 transition-all duration-200"
        />
      </div>
      <BottomNavigation 
        onAddChannels={() => {}}
        onChannelSelect={onChannelSelect as any}
        addedChannels={userChannels || []}
        favoriteChannelUrls={favoriteChannels}
        onLocalVideoSelect={() => {}}
        user={user}
        isUserLoading={isUserLoading}
        onToggleFavorite={handleToggleFavorite}
      />
    </>
  );
}
