'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Video } from '@/lib/videos';
import { useToast } from '@/hooks/use-toast';

interface VideoCardProps {
  video: Video;
  avatarUrl: string;
  isActive: boolean;
  isMuted: boolean;
  toggleMute: () => void;
}

export function VideoCard({ video, avatarUrl, isActive, isMuted, toggleMute }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.muted = isMuted;

    if (isActive) {
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error("Video play failed:", error);
            setIsPlaying(false);
            if (!isMuted) {
              toast({
                title: "Playback Error",
                description: "Your browser blocked unmuted autoplay. Tap to play or enable sound for autoplay.",
                variant: "destructive",
              });
            }
          });
      }
    } else {
      videoElement.pause();
      if (videoElement.currentTime > 0) {
        videoElement.currentTime = 0;
      }
      setIsPlaying(false);
      setProgress(0);
    }
  }, [isActive, isMuted, toast]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const { currentTime, duration } = videoRef.current;
      if (duration > 0) {
        setProgress((currentTime / duration) * 100);
      }
    }
  };

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMute();
  };

  const handleInteraction = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    videoElement?.addEventListener('mousemove', handleInteraction);
    return () => {
      videoElement?.removeEventListener('mousemove', handleInteraction);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [handleInteraction]);

  return (
    <div
      className="relative w-full h-full bg-black flex items-center justify-center cursor-pointer"
      onClick={handleVideoClick}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={video.url}
        loop
        playsInline
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => handleInteraction()}
        onPause={() => handleInteraction()}
      />

      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        } flex flex-col justify-between p-4 md:p-6 pointer-events-none`}
      >
        <div className="flex justify-end">
          
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          {!isPlaying && (
            <div onClick={handleVideoClick} className="pointer-events-auto">
              
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-white">
            <Avatar className="h-12 w-12 border-2 border-white/50">
              <AvatarImage src={avatarUrl} alt={video.author} />
              <AvatarFallback className="bg-primary text-primary-foreground">{video.author.substring(1, 3).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-headline text-lg font-bold drop-shadow-md">{video.title}</h3>
              <p className="text-sm text-gray-200 drop-shadow-sm">{video.author}</p>
            </div>
          </div>
          <Progress value={progress} className="w-full h-1 bg-white/30 [&>*]:bg-accent" />
        </div>
      </div>
    </div>
  );
}
