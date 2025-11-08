'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, ChevronRight, LogOut, Copy, Download, Plus, Tv2, Upload } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Video } from '@/lib/videos';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { Input } from '@/components/ui/input';
import { signOut, User, onAuthStateChanged } from 'firebase/auth';
import { jsPDF } from 'jspdf';
import { useTranslation } from '@/lib/i18n';
import { fetchM3u } from '@/ai/flows/m3u-proxy-flow';
import { checkChannelStatus } from '@/ai/flows/check-channel-status-flow';
import { parseM3u, type M3uChannel } from '@/lib/m3u-parser';
import { Separator } from './ui/separator';

interface VideoCardProps {
  video: Video;
  avatarUrl: string;
  isActive: boolean;
}

// Define the Channel type
interface Channel {
  id: string;
  name: string;
  logo: string;
  url: string; // Add url for the channel
}

function PrivacyPolicySheetContent() {
  const { t } = useTranslation();
  return (
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x h-3/4">
      <SheetHeader>
        <SheetTitle>{t('privacyPolicyTitle')}</SheetTitle>
      </SheetHeader>
      <div className="p-4 overflow-y-auto h-full">
        <div className="space-y-4">
          <p>{t('privacyPolicyP1')}</p>
          <h2 className="text-2xl font-semibold">{t('privacyPolicyH2_1')}</h2>
          <p>{t('privacyPolicyP2')}</p>

          <h2 className="text-2xl font-semibold">{t('privacyPolicyH2_2')}</h2>
          <p>{t('privacyPolicyP3')}</p>

          <h2 className="text-2xl font-semibold">{t('privacyPolicyH2_3')}</h2>
          <p>{t('privacyPolicyP4')}</p>

          <h2 className="text-2xl font-semibold">{t('privacyPolicyH2_4')}</h2>
          <p>{t('privacyPolicyP5')}</p>
          <p>{t('privacyPolicyP6')}</p>
          <p>{t('privacyPolicyP7')}</p>
        </div>
      </div>
    </SheetContent>
  )
}

function ImprintSheetContent() {
  const { t } = useTranslation();
  return (
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x h-3/4">
      <SheetHeader>
        <SheetTitle>{t('imprintTitle')}</SheetTitle>
      </SheetHeader>
      <div className="p-4 overflow-y-auto h-full">
        <div className="space-y-4">
          <p>SnackingTV Inc.</p>
          <p>123 Snack Street</p>
          <p>Food City, 98765</p>
          <p>United States</p>

          <h2 className="text-2xl font-semibold mt-6">{t('imprintContact')}</h2>
          <p>Email: contact@snacking.tv</p>
          <p>Phone: +1 (555) 123-4567</p>

          <h2 className="text-2xl font-semibold mt-6">{t('imprintRepresentedBy')}</h2>
          <p>John Doe, CEO</p>

          <h2 className="text-2xl font-semibold mt-6">{t('imprintRegisterEntry')}</h2>
          <p>{t('imprintRegisterCourt')}</p>
          <p>{t('imprintRegisterNumber')}</p>
        </div>
      </div>
    </SheetContent>
  )
}

function ChannelListSheetContent({ channels }: { channels: Channel[] }) {
  const { t } = useTranslation();

  return (
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x h-[60vh]">
      <SheetHeader>
        <SheetTitle>{t('channels')}</SheetTitle>
      </SheetHeader>
      <div className="p-4 overflow-y-auto h-full">
        {channels.length > 0 ? (
          <ul className="space-y-2">
            {channels.map((channel) => (
              <li key={channel.id}>
                <button className="w-full flex items-center gap-4 p-2 rounded-lg hover:bg-accent text-left">
                  <Image
                    src={channel.logo}
                    alt={channel.name}
                    width={40}
                    height={40}
                    className="rounded-md"
                  />
                  <span className="font-medium">{channel.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-center">{t('noChannels')}</p>
        )}
      </div>
    </SheetContent>
  );
}

function AddChannelSheetContent({ onAddChannel }: { onAddChannel: (channels: M3uChannel[]) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [channelLink, setChannelLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef(false);

  const processM3uContent = async (content: string, source: string) => {
    isCancelledRef.current = false;
    setIsLoading(true);
    setIsVerifying(true);
    setVerificationProgress(0);

    try {
      const parsedChannels = parseM3u(content);
      if (parsedChannels.length === 0) {
        toast({
          variant: 'destructive',
          title: t('noChannelsFoundTitle'),
          description: t('noChannelsFoundDescription'),
        });
        return false;
      }
      
      toast({
        title: t('checkingChannelsTitle'),
        description: t('checkingChannelsDescription', { count: parsedChannels.length }),
      });

      const onlineChannels: M3uChannel[] = [];
      let checkedCount = 0;

      const checkPromises = parsedChannels.map(async (channel) => {
        if (isCancelledRef.current) return;
        const result = await checkChannelStatus({ url: channel.url });
        if (isCancelledRef.current) return;
        if (result.online) {
          onlineChannels.push(channel);
        }
        checkedCount++;
        setVerificationProgress(Math.round((checkedCount / parsedChannels.length) * 100));
      });

      await Promise.all(checkPromises);

      if (isCancelledRef.current) {
        toast({
            title: t('verificationCancelledTitle'),
            description: t('verificationCancelledDescription'),
        });
        return false;
      }

      if (onlineChannels.length > 0) {
        onAddChannel(onlineChannels);
        toast({
          title: t('channelAddedTitle'),
          description: t('channelAddedDescription', { count: onlineChannels.length }),
        });
      } else {
         toast({
          variant: 'destructive',
          title: t('noOnlineChannelsTitle'),
          description: t('noOnlineChannelsDescription'),
        });
      }
      return true;

    } catch (error) {
      if (isCancelledRef.current) return false;
      console.error(`Failed to parse M3U from ${source}:`, error);
      toast({
        variant: 'destructive',
        title: t('channelAddErrorTitle'),
        description: t('channelAddErrorDescription'),
      });
      return false;
    } finally {
      setIsLoading(false);
      setIsVerifying(false);
    }
  }

  const handleAddFromUrl = async () => {
    const cleanedLink = channelLink.split(' ')[0].trim();
    if (!cleanedLink || !cleanedLink.startsWith('http')) {
      toast({
        variant: 'destructive',
        title: t('invalidLinkTitle'),
        description: t('invalidLinkDescription'),
      });
      return;
    }
    setIsLoading(true);
    try {
      const m3uContent = await fetchM3u({ url: cleanedLink });
      if (!m3uContent) {
        throw new Error("Could not fetch M3U content.");
      }
      if (await processM3uContent(m3uContent, 'URL')) {
        setChannelLink('');
      }
    } catch (error) {
      console.error("Failed to add channel from URL:", error);
      toast({
        variant: 'destructive',
        title: t('channelAddErrorTitle'),
        description: t('channelAddErrorDescription'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (content) {
        await processM3uContent(content, 'file');
      }
    };
    reader.onerror = () => {
      toast({
        variant: 'destructive',
        title: t('fileReadErrorTitle'),
        description: t('fileReadErrorDescription'),
      });
    }
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  }

  const handleCancelVerification = () => {
    isCancelledRef.current = true;
    setIsLoading(false);
    setIsVerifying(false);
  };

  return (
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x h-auto">
      <SheetHeader>
        <SheetTitle>{t('addChannel')}</SheetTitle>
      </SheetHeader>
      <div className="p-4 space-y-4">
        {isVerifying ? (
           <div className="space-y-4 text-center">
            <p>{t('checkingChannelsTitle')}</p>
            <Progress value={verificationProgress} />
            <p className="text-sm text-muted-foreground">{verificationProgress}%</p>
            <Button onClick={handleCancelVerification} variant="outline" className="w-full">
              {t('cancelVerification')}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor="channel-link" className="text-sm font-medium">{t('channelLink')}</label>
              <div className="flex gap-2">
                <Input
                  id="channel-link"
                  placeholder="https://.../playlist.m3u"
                  value={channelLink}
                  onChange={(e) => setChannelLink(e.target.value)}
                  disabled={isLoading}
                  className="flex-grow"
                />
                <Button onClick={handleAddFromUrl} disabled={isLoading || !channelLink}>
                  {isLoading ? t('loading') : t('add')}
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-background px-2 text-sm text-muted-foreground">{t('or')}</span>
            </div>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".m3u,.m3u8"
                className="hidden"
                disabled={isLoading}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {t('uploadFile')}
              </Button>
            </div>
          </>
        )}
      </div>
    </SheetContent>
  );
}


function SettingsSheetContent() {
  const [anonymousIdInput, setAnonymousIdInput] = useState('');
  const { toast } = useToast();
  const auth = useAuth();
  const { t, language, setLanguage } = useTranslation();
  
  const [localUser, setLocalUser] = useState<User | { uid: string, isAnonymous: boolean } | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const updateLocalUser = (user: User | { uid: string; isAnonymous: boolean } | null) => {
      setLocalUser(user);
      if (user) {
        localStorage.setItem('manualUser', JSON.stringify(user));
      } else {
        localStorage.removeItem('manualUser');
      }
    };
    
    const manualUserJson = localStorage.getItem('manualUser');
    if (manualUserJson) {
      updateLocalUser(JSON.parse(manualUserJson));
    }
    
    // Subscribe to auth state changes from Firebase
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          // Firebase auth state takes precedence if user is logged in via Firebase
          updateLocalUser(firebaseUser);
          if (firebaseUser.isAnonymous) {
             toast({
              title: t('loggedIn'),
              description: t('nowLoggedInAnonymously'),
            });
          } else {
            toast({
              title: t('loggedIn'),
              description: t('nowLoggedIn'),
            });
          }
        } else if (!localStorage.getItem('manualUser')) {
          // Only log out if there's no manual user either
          updateLocalUser(null);
        }
      });
      return () => unsubscribe();
    }
  }, [auth, toast, t]);

  const handleLogout = () => {
    const performLogout = () => {
      localStorage.removeItem('manualUser');
      setLocalUser(null);
      toast({
        title: t('loggedOut'),
        description: t('loggedOutSuccessfully'),
      });
    };

    if (auth && auth.currentUser) {
      signOut(auth).then(performLogout).catch(performLogout);
    } else {
      performLogout();
    }
  };


  const handleCopy = () => {
    if (localUser) {
      navigator.clipboard.writeText(localUser.uid);
      toast({
        title: t('copied'),
        description: t('anonymousIdCopied'),
      });
    }
  };

  const handleSaveAsPdf = () => {
    if (localUser) {
      const doc = new jsPDF();
      doc.text(t('pdfTitle'), 10, 10);
      doc.text(t('pdfNotice'), 10, 20);
      doc.setFont('courier');
      doc.text(localUser.uid, 10, 30);
      doc.save("snacking-tv-user-id.pdf");
      toast({
        title: t('pdfSaved'),
        description: t('userIdSavedAsPdf'),
      });
    }
  };
  
  const handleManualSignIn = (id: string) => {
    if (!id.trim()) {
      toast({
        variant: "destructive",
        title: t('invalidId'),
        description: t('pleaseEnterValidId'),
      });
      return;
    }
    const fakeUser = { uid: id, isAnonymous: true };
    localStorage.setItem('manualUser', JSON.stringify(fakeUser));
    setLocalUser(fakeUser);
    
    if(auth && auth.currentUser) {
      signOut(auth);
    }
    
    toast({
        title: t('loggedInWithId'),
        description: t('nowUsingAnonymousId', {id: id}),
    });
  }

  const handleNewAnonymousProfile = () => {
    if (auth) {
      localStorage.removeItem('manualUser'); 
      initiateAnonymousSignIn(auth);
    }
  }
  
  if (!isClient) {
    return (
      <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x">
        <SheetHeader>
          <SheetTitle>{t('settings')}</SheetTitle>
        </SheetHeader>
        <div className="p-4">{t('loading')}</div>
      </SheetContent>
    )
  }

  return (
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x">
      <SheetHeader>
        <SheetTitle>{t('settings')}</SheetTitle>
      </SheetHeader>
      <div className="p-4">
        <ul className="space-y-4">
          {localUser ? (
            <li className="space-y-2">
              <p className="text-sm font-medium">{t('yourAnonymousId')}</p>
              <div className="flex items-center gap-2">
                <p className="flex-grow text-xs text-muted-foreground p-2 bg-muted rounded-md font-mono break-all">{localUser.uid}</p>
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleSaveAsPdf}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={handleLogout} variant="outline" className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')}
              </Button>
            </li>
          ) : (
            <li>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('login')}</p>
                <div className="flex gap-2">
                  <Input 
                    placeholder={t('enterExistingAnonymousId')}
                    value={anonymousIdInput}
                    onChange={(e) => setAnonymousIdInput(e.target.value)}
                    className="flex-grow"
                  />
                  <Button onClick={() => handleManualSignIn(anonymousIdInput)} disabled={!anonymousIdInput} variant={anonymousIdInput ? "default" : "outline"}>
                    {t('go')}
                  </Button>
                </div>
                <Button onClick={handleNewAnonymousProfile} variant="link" className="p-0 h-auto text-sm">
                  {t('orCreateNewAnonymousProfile')}
                </Button>
              </div>
            </li>
          )}
           <li className="space-y-2">
              <p className="text-sm font-medium">{t('language')}</p>
              <div className="flex items-center gap-2">
                <Button onClick={() => setLanguage('de')} variant={language === 'de' ? 'default' : 'outline'} className="flex-1">
                  {t('german')}
                </Button>
                <Button onClick={() => setLanguage('en')} variant={language === 'en' ? 'default' : 'outline'} className="flex-1">
                  {t('english')}
                </Button>
              </div>
            </li>
          <li>
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-accent w-full">
                  <span>{t('privacyPolicy')}</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </SheetTrigger>
              <PrivacyPolicySheetContent />
            </Sheet>
          </li>
          <li>
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-accent w-full">
                  <span>{t('imprint')}</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </SheetTrigger>
              <ImprintSheetContent />
            </Sheet>
          </li>
        </ul>
      </div>
    </SheetContent>
  );
}


export function VideoCard({ video, avatarUrl, isActive }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();

  const [channels, setChannels] = useState<Channel[]>([]);

  const handleAddChannel = (newChannels: M3uChannel[]) => {
    const transformedChannels: Channel[] = newChannels.map(c => ({
      id: c.url, // Use URL as a unique ID
      name: c.name,
      logo: c.logo,
      url: c.url,
    }));

    setChannels(prevChannels => {
      const existingUrls = new Set(prevChannels.map(c => c.url));
      const filteredNewChannels = transformedChannels.filter(c => !existingUrls.has(c.url));
      return [...prevChannels, ...filteredNewChannels];
    });
  };


  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.muted = false;

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
  }, [isActive]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const { currentTime, duration } = videoRef.current;
      if (duration > 0) {
        setProgress((currentTime / duration) * 100);
      }
    }
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if ((e.target as HTMLElement).closest('[data-radix-collection-item]') || (e.target as HTMLElement).closest('button')) {
      return;
    }

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
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
        }`}
      >
        <div className="absolute top-4 right-4 md:top-6 md:right-6">
           <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white bg-black/20 hover:bg-black/40 rounded-full h-12 w-12">
                <Settings size={28} className="drop-shadow-md"/>
              </Button>
            </SheetTrigger>
            <SettingsSheetContent />
          </Sheet>
        </div>

        <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-14 w-14 flex-col gap-1 text-white bg-black/20 hover:bg-black/40 rounded-full">
                  <Plus size={32} className="drop-shadow-md" />
                </Button>
              </SheetTrigger>
              <AddChannelSheetContent onAddChannel={handleAddChannel} />
            </Sheet>
           <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-14 w-14 flex-col gap-1 text-white bg-black/20 hover:bg-black/40 rounded-full">
                  <Tv2 size={32} className="drop-shadow-md" />
                </Button>
              </SheetTrigger>
              <ChannelListSheetContent channels={channels} />
            </Sheet>
        </div>


        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!isPlaying && (
            <div className="pointer-events-auto">
              
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
          <div className="space-y-3 pointer-events-none text-white w-full max-w-[calc(100%-80px)] drop-shadow-md">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-white/50">
                <AvatarImage src={avatarUrl} alt={video.author} />
                <AvatarFallback className="bg-primary text-primary-foreground">{video.author.substring(1, 3).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-headline text-lg font-bold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>{video.title}</h3>
                <p className="text-sm" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>{video.author}</p>
              </div>
            </div>
            <Progress value={progress} className="w-full h-1 bg-white/30 [&>*]:bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}
