'use client';

import React, { useState, useRef, useEffect, useCallback, MutableRefObject } from 'react';
import { Settings, ChevronRight, LogOut, Copy, Download, Plus, Tv2, Upload, Wifi, WifiOff, Star, Search, Folder, Trash2, ShieldCheck, X, Maximize, Minimize, Eye, EyeOff, Mic, User as UserIcon, KeyRound, Mail, Clock, Share2, Loader, Captions, MessageSquareWarning, CalendarDays, Link } from 'lucide-react';
import Image from 'next/image';
import Hls from 'hls.js';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Video } from '@/lib/videos';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth, useFirestore, useUser, initiateEmailSignIn, initiateEmailSignUp, useCollection, useMemoFirebase, initiateAnonymousSignIn } from '@/firebase';
import { Input } from '@/components/ui/input';
import { signOut, User, updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useTranslation } from '@/lib/i18n';
import { fetchM3u } from '@/ai/flows/m3u-proxy-flow';
import { checkChannelStatus } from '@/ai/flows/check-channel-status-flow';
import { searchM3u, SearchM3uOutput } from '@/ai/flows/search-m3u-flow';
import { parseM3u, type M3uChannel } from '@/lib/m3u-parser';
import { Separator } from './ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { WithId } from '@/firebase/firestore/use-collection';
import { Checkbox } from '@/components/ui/checkbox';
import { deleteChannels } from '@/firebase/firestore/deletions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import ReactPlayer from 'react-player';

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  onAddChannels: (newChannels: M3uChannel[]) => void;
  onChannelSelect: (channel: M3uChannel | Video) => void;
  addedChannels: WithId<M3uChannel>[];
  isFavorite: boolean;
  onToggleFavorite: (channelUrl: string) => void;
  onProgressUpdate: (progress: number) => void;
  onDurationChange: (duration: number) => void;
  activeVideoRef: MutableRefObject<HTMLVideoElement | null>;
  localVideoItem: Video | null;
  showCaptions: boolean;
  videoQuality: string;
  onQualityLevelsChange: (levels: { label: string; level: number }[]) => void;
  bufferSize: string;
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
    <SheetContent side="bottom" className="h-3/4">
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
    <SheetContent side="bottom" className="h-3/4">
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

export function FavoriteChannelListSheetContent({ 
  channels, 
  onChannelSelect,
  title,
  onToggleFavorite
}: { 
  channels: WithId<M3uChannel>[]; 
  onChannelSelect: (channel: M3uChannel) => void;
  title: string;
  onToggleFavorite: (channelUrl: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <SheetContent side="bottom" className="h-[60vh] rounded-t-lg">
      <SheetHeader className="text-center">
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>
      <div className="p-4 overflow-y-auto h-[calc(100%-80px)]">
        {channels.length > 0 ? (
          <ul className="space-y-1">
            {channels.map((channel) => (
              <li key={channel.id} className="flex items-center gap-2 rounded-lg hover:bg-accent/50 pr-2">
                <button
                  onClick={() => onChannelSelect(channel)}
                  className="w-full flex items-center gap-4 p-2 text-left"
                >
                  <Image
                    src={channel.logo}
                    alt={channel.name}
                    width={40}
                    height={40}
                    className="rounded-md"
                  />
                  <span className="font-medium flex-grow truncate">{channel.name}</span>
                </button>
                <Button variant="ghost" size="icon" onClick={() => onToggleFavorite(channel.url)} className='text-destructive/80 hover:text-destructive'>
                  <Trash2 className="h-5 w-5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-center py-4">{t('noFavorites')}</p>
        )}
      </div>
    </SheetContent>
  );
}

export function ChannelListSheetContent({ 
  channels, 
  onChannelSelect,
  title,
}: { 
  channels: WithId<M3uChannel>[]; 
  onChannelSelect: (channel: M3uChannel) => void;
  title: string;
}) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isManaging, setIsManaging] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  const handleToggleSelect = (channelId: string) => {
    setSelectedChannels(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(channelId)) {
        newSelection.delete(channelId);
      } else {
        newSelection.add(channelId);
      }
      return newSelection;
    });
  };
  
  const handleSelectAll = () => {
      if(selectedChannels.size === channels.length) {
          setSelectedChannels(new Set());
      } else {
          setSelectedChannels(new Set(channels.map(c => c.id)));
      }
  };

  const handleDeleteSelected = async () => {
    if (!firestore) return;
    try {
        await deleteChannels(firestore, Array.from(selectedChannels));
        toast({
            title: t('channelsDeletedTitle'),
            description: t('channelsDeletedDescription', { count: selectedChannels.size }),
        });
        setSelectedChannels(new Set());
        setIsManaging(false);
    } catch (error) {
        console.error("Error deleting channels: ", error);
        toast({
            variant: "destructive",
            title: t('deleteErrorTitle'),
            description: t('deleteErrorDescription'),
        });
    }
  };
  
  const renderChannelList = (channelList: WithId<M3uChannel>[], emptyMessage: string) => {
    return channelList.length > 0 ? (
      <ul className="space-y-1">
        {channelList.map((channel) => (
          <li key={channel.id} className="flex items-center gap-2 rounded-lg hover:bg-accent/50 pr-2">
            {isManaging && (
              <Checkbox
                checked={selectedChannels.has(channel.id)}
                onCheckedChange={() => handleToggleSelect(channel.id)}
                className="ml-2"
                aria-label={`Select ${channel.name}`}
              />
            )}
            <button
              onClick={() => !isManaging && onChannelSelect(channel)}
              className="w-full flex items-center gap-4 p-2 text-left disabled:opacity-50"
              disabled={isManaging}
            >
              <Image
                src={channel.logo}
                alt={channel.name}
                width={40}
                height={40}
                className="rounded-md"
              />
              <span className="font-medium flex-grow truncate">{channel.name}</span>
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-muted-foreground text-center py-4">{emptyMessage}</p>
    );
  };

  return (
    <SheetContent side="bottom" className="h-[60vh] rounded-t-lg">
      <SheetHeader className="text-center">
        <div className="relative flex justify-between items-center">
          {channels.length > 0 ? (
            <Button
              variant="ghost"
              onClick={() => {
                setIsManaging(!isManaging);
                setSelectedChannels(new Set());
              }}
              className="w-24 text-left justify-start"
            >
              {isManaging ? t('done') : t('manage')}
            </Button>
          ) : <div className="w-24"></div> }
          <SheetTitle className="absolute left-1/2 -translate-x-1/2">{title}</SheetTitle>
          <div className="w-24"></div>
        </div>
      </SheetHeader>
      <div className="p-4 overflow-y-auto h-[calc(100%-80px)]">
         {renderChannelList(channels, t('noChannels'))}
      </div>
      {isManaging && (
        <div className="absolute bottom-0 left-0 right-0 bg-background border-t p-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Checkbox id="select-all" onCheckedChange={handleSelectAll} checked={selectedChannels.size > 0 && selectedChannels.size === channels.length} />
                <label htmlFor="select-all">{t('selectAll')}</label>
            </div>
            <Button variant="destructive" onClick={handleDeleteSelected} disabled={selectedChannels.size === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('deleteSelected', { count: selectedChannels.size })}
            </Button>
        </div>
      )}
    </SheetContent>
  );
}

export function AddChannelSheetContent({ onAddChannel, user, isUserLoading }: { onAddChannel?: (channels: M3uChannel[]) => void, user: User | null, isUserLoading: boolean }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [channelLink, setChannelLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef(false);
  const [verifiedChannels, setVerifiedChannels] = useState<M3uChannel[]>([]);
  const onlineChannelsRef = useRef<M3uChannel[]>([]);
  const [selectedVerifiedChannels, setSelectedVerifiedChannels] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('add');

  // Web Search State
  const [searchLanguage, setSearchLanguage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchM3uOutput>([]);
  const [searchCooldown, setSearchCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (searchCooldown > 0) {
      timer = setInterval(() => {
        setSearchCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [searchCooldown]);

  const handleSaveChannels = async (channelsToSave: M3uChannel[]) => {
    if (!firestore || !user) {
        toast({
            variant: 'destructive',
            title: t('notLoggedInTitle'),
            description: t('notLoggedInDescription'),
        });
        return 0;
    }
    if (channelsToSave.length === 0) {
        return 0;
    }

    const userChannelsRef = collection(firestore, 'user_channels');
    
    const q = query(userChannelsRef, where('userId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    const existingUrls = new Set(querySnapshot.docs.map(doc => doc.data().url));

    const newChannelsToAdd = channelsToSave.filter(channel => !existingUrls.has(channel.url));

    const channelsThatExist = channelsToSave.length - newChannelsToAdd.length;
    if (channelsThatExist > 0) {
        toast({
            title: t('channelsExistTitle'),
            description: t('channelsExistDescription', { count: channelsThatExist }),
        });
    }
    
    if (newChannelsToAdd.length === 0) {
        if (channelsThatExist === 0) {
            toast({
                variant: 'destructive',
                title: t('noNewChannelsTitle'),
                description: t('noNewChannelsDescription'),
            });
        }
        return 0;
    }

    for (const channel of newChannelsToAdd) {
        addDocumentNonBlocking(userChannelsRef, {
            ...channel,
            userId: user.uid,
            addedAt: serverTimestamp(),
        });
    }

    return newChannelsToAdd.length;
  };
  
  const processM3uContent = async (content: string, source: string) => {
    isCancelledRef.current = false;
    setVerifiedChannels([]);
    setSelectedVerifiedChannels(new Set());
    setIsLoading(true);
    setIsVerifying(true);
    setVerificationProgress(0);
    setOnlineCount(0);
    setOfflineCount(0);
    setTotalCount(0);
    onlineChannelsRef.current = [];

    let parsedChannels: M3uChannel[] = [];
    try {
      parsedChannels = parseM3u(content);
      if (parsedChannels.length === 0) {
        toast({
          variant: 'destructive',
          title: t('noChannelsFoundTitle'),
          description: t('noChannelsFoundDescription'),
        });
        setIsLoading(false);
        setIsVerifying(false);
        return false;
      }
    } catch (error) {
       console.error(`Failed to parse M3U from ${source}:`, error);
      toast({
        variant: 'destructive',
        title: t('channelAddErrorTitle'),
        description: t('channelAddErrorDescription'),
      });
      setIsLoading(false);
      setIsVerifying(false);
      return false;
    }
      
    setTotalCount(parsedChannels.length);
    
    toast({
      title: t('checkingChannelsTitle'),
      description: t('checkingChannelsDescription', { count: parsedChannels.length }),
    });
    
    let checkedCount = 0;
    const onlineChannels: M3uChannel[] = [];

    for (const channel of parsedChannels) {
      if (isCancelledRef.current) break; 
      try {
        const result = await checkChannelStatus({ url: channel.url });
        if (result.online) {
          onlineChannels.push(channel);
          onlineChannelsRef.current.push(channel);
          setOnlineCount(c => c + 1);
        } else {
          setOfflineCount(c => c + 1);
        }
      } catch (error) {
        setOfflineCount(c => c + 1);
      } finally {
        if (!isCancelledRef.current) {
          checkedCount++;
          setVerificationProgress(Math.round((checkedCount / parsedChannels.length) * 100));
        }
      }
    }
    
    setIsVerifying(false);
    setIsLoading(false);

    if (isCancelledRef.current) {
       toast({
          title: t('verificationCancelledTitle'),
          description: t('verificationCancelledDescription'),
      });
      if (onlineChannelsRef.current.length > 0) {
          const addedCount = await handleSaveChannels(onlineChannelsRef.current);
          if (addedCount > 0) {
             toast({
              title: t('channelAddedTitle'),
              description: t('channelAddedDescription', { count: addedCount }),
            });
          }
      }
      return false;
    } 
    
    if (onlineChannels.length > 0) {
      setVerifiedChannels(onlineChannels);
       toast({
        title: t('verificationCompleteTitle'),
        description: t('verificationCompleteDescription', { count: onlineChannels.length }),
      });
    } else {
       toast({
        variant: 'destructive',
        title: t('noOnlineChannelsTitle'),
        description: t('noOnlineChannelsDescription'),
      });
    }
    
    return onlineChannels.length > 0;
  }

  const handleAddFromUrl = async (url?: string) => {
    const link = url || channelLink;
    if (!link) {
        toast({
            variant: 'destructive',
            title: t('invalidLinkTitle'),
            description: t('invalidLinkDescription'),
        });
        return;
    }
    const cleanedLink = link.split(' ')[0].trim();
    if (!cleanedLink || (!cleanedLink.startsWith('http') && !ReactPlayer.canPlay(cleanedLink))) {
      toast({
        variant: 'destructive',
        title: t('invalidLinkTitle'),
        description: t('invalidLinkDescription'),
      });
      return;
    }
    setIsLoading(true);
    setSearchResults([]); // Clear search results when processing a URL
    
    // If it's a direct playable link (YouTube, Twitch), add it directly
    if (ReactPlayer.canPlay(cleanedLink) && !cleanedLink.endsWith('.m3u') && !cleanedLink.endsWith('.m3u8')) {
        const newChannel: M3uChannel = {
            name: cleanedLink,
            logo: `https://picsum.photos/seed/iptv${Math.random()}/64/64`,
            url: cleanedLink,
            group: 'Direct Link'
        };
        const addedCount = await handleSaveChannels([newChannel]);
         if (addedCount > 0) {
            toast({
                title: t('channelAddedTitle'),
                description: t('channelAddedDescription', { count: addedCount }),
            });
            setChannelLink('');
        }
        setIsLoading(false);
        return;
    }
    
    // If it's an M3U link, process it
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
  
  const handleSaveSelectedChannels = async () => {
    setIsLoading(true);
    const channelsToSave = verifiedChannels.filter(channel => 
        selectedVerifiedChannels.has(channel.url)
    );
    const addedCount = await handleSaveChannels(channelsToSave);

    if (addedCount > 0) {
       toast({
        title: t('channelAddedTitle'),
        description: t('channelAddedDescription', { count: addedCount }),
      });
    }
    setIsLoading(false);
    setVerifiedChannels([]);
    setSelectedVerifiedChannels(new Set());
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
    event.target.value = '';
  }

  const handleCancelVerification = async () => {
    isCancelledRef.current = true;
    setIsVerifying(false);
    
    if (onlineChannelsRef.current.length > 0) {
      const addedCount = await handleSaveChannels(onlineChannelsRef.current);
      if (addedCount > 0) {
        toast({
          title: t('channelAddedTitle'),
          description: t('channelAddedDescription', { count: addedCount }),
        });
      }
    }
  };
  
  const handleToggleSelectVerified = (channelUrl: string) => {
    setSelectedVerifiedChannels(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(channelUrl)) {
        newSelection.delete(channelUrl);
      } else {
        newSelection.add(channelUrl);
      }
      return newSelection;
    });
  };

  const handleSelectAllVerified = () => {
    if (selectedVerifiedChannels.size === verifiedChannels.length) {
      setSelectedVerifiedChannels(new Set());
    } else {
      setSelectedVerifiedChannels(new Set(verifiedChannels.map(c => c.url)));
    }
  };

  const handleLanguageSearch = async () => {
    if (!searchLanguage || searchCooldown > 0) return;
    setIsSearching(true);
    setSearchResults([]);
    setSearchCooldown(30);
    try {
      const results = await searchM3u({ language: searchLanguage });
      setSearchResults(results);
      if (results.length === 0) {
        toast({ title: t('noResultsFound') });
      }
    } catch (error) {
      console.error("Web search failed:", error);
      toast({ variant: 'destructive', title: t('searchFailed') });
    } finally {
      setIsSearching(false);
    }
  };


  if (verifiedChannels.length > 0) {
    return (
      <SheetContent side="bottom" className="h-[75vh] flex flex-col rounded-t-lg">
        <SheetHeader>
          <SheetTitle>{t('foundOnlineChannelsTitle', { count: verifiedChannels.length })}</SheetTitle>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
           <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
              <Checkbox id="select-all-verified" onCheckedChange={handleSelectAllVerified} checked={selectedVerifiedChannels.size > 0 && selectedVerifiedChannels.size === verifiedChannels.length} />
              <label htmlFor="select-all-verified" className='text-sm font-medium'>{t('selectAll')}</label>
            </div>
            <ul className="space-y-1">
            {verifiedChannels.map((channel) => (
              <li key={channel.url} onClick={() => handleToggleSelectVerified(channel.url)} className="flex items-center gap-4 p-2 rounded-lg cursor-pointer hover:bg-accent/50">
                 <Checkbox checked={selectedVerifiedChannels.has(channel.url)} />
                <Image src={channel.logo} alt={channel.name} width={40} height={40} className="rounded-md" />
                <span className="font-medium flex-grow truncate">{channel.name}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t p-4 flex justify-between items-center">
            <Button variant="ghost" onClick={() => setVerifiedChannels([])}>{t('cancel')}</Button>
            <Button onClick={handleSaveSelectedChannels} disabled={isLoading || selectedVerifiedChannels.size === 0}>
                {isLoading ? t('loading') : t('addSelected', { count: selectedVerifiedChannels.size })}
            </Button>
        </div>
      </SheetContent>
    );
  }
  
  const isDisabled = isUserLoading || isLoading;

  return (
    <SheetContent side="bottom" className="h-auto rounded-t-lg">
      <SheetHeader>
        <SheetTitle className="text-center">{t('addChannel')}</SheetTitle>
      </SheetHeader>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add">{t('add')}</TabsTrigger>
          <TabsTrigger value="search">{t('webSearch')}</TabsTrigger>
        </TabsList>
        <TabsContent value="add">
          <div className="p-4 space-y-4">
            {isVerifying ? (
              <div className="space-y-4 text-center">
                <p className="font-medium">{t('checkingChannelsTitle')}</p>
                <Progress value={verificationProgress} />
                <div className="flex justify-around text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span>{t('online', { count: onlineCount })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <WifiOff className="h-4 w-4 text-red-500" />
                    <span>{t('offline', { count: offlineCount })}</span>
                  </div>
                  <span>{t('total', { count: totalCount })}</span>
                </div>
                <p className="text-sm text-muted-foreground">{verificationProgress}% {t('complete')}</p>
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
                      disabled={!user || isDisabled}
                      className="flex-grow"
                    />
                    <Button onClick={() => handleAddFromUrl()} disabled={!user || isDisabled || !channelLink}>
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
                    disabled={!user || isDisabled}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                    disabled={!user || isDisabled}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {t('uploadFile')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>
        <TabsContent value="search" className="h-[45vh] flex flex-col">
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Select onValueChange={setSearchLanguage} disabled={isSearching || !user || searchCooldown > 0}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectLanguage')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arabic">{t('arabic')}</SelectItem>
                  <SelectItem value="chinese">{t('chinese')}</SelectItem>
                  <SelectItem value="en">{t('english')}</SelectItem>
                  <SelectItem value="french">{t('french')}</SelectItem>
                  <SelectItem value="de">{t('german')}</SelectItem>
                  <SelectItem value="hindi">{t('hindi')}</SelectItem>
                  <SelectItem value="italian">{t('italian')}</SelectItem>
                  <SelectItem value="japanese">{t('japanese')}</SelectItem>
                  <SelectItem value="korean">{t('korean')}</SelectItem>
                  <SelectItem value="portuguese">{t('portuguese')}</SelectItem>
                  <SelectItem value="russian">{t('russian')}</SelectItem>
                  <SelectItem value="es">{t('spanish')}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleLanguageSearch} disabled={!searchLanguage || isSearching || !user || searchCooldown > 0}>
                {isSearching ? <Loader className="h-4 w-4 animate-spin" /> : (searchCooldown > 0 ? t('searchCooldown', { seconds: searchCooldown }) : t('search'))}
              </Button>
            </div>

            {isSearching && (
               <div className="flex items-center justify-center p-4">
                  <Loader className="h-6 w-6 animate-spin" />
               </div>
            )}
          </div>
          
          <div className="flex-grow overflow-y-auto px-4">
            {searchResults.length > 0 && (
              <div className="border-t pt-4 mt-4 space-y-1">
                {searchResults.map((playlist) => (
                  <div key={playlist.url} onClick={() => handleAddFromUrl(playlist.url)} className="flex items-center gap-4 p-2 rounded-lg cursor-pointer hover:bg-accent/50">
                    <Link className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-grow">
                      <p className="font-medium truncate">{playlist.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{playlist.url}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </SheetContent>
  );
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  acceptPrivacy: z.boolean().refine(val => val === true, {
    message: "You must accept the privacy policy",
  }),
});

const updateEmailSchema = z.object({
  newEmail: z.string().email("invalidEmail"),
  currentPassword: z.string().min(1, "passwordRequired"),
});

const updatePasswordSchema = z
  .object({
    newPassword: z.string().min(6, "passwordTooShort"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "passwordsDontMatch",
    path: ["confirmPassword"],
  });


export function AuthSheetContent({ initialTab = 'login' }: { initialTab?: 'login' | 'register' }) {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const auth = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: 'onChange',
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", acceptPrivacy: false },
    mode: 'onChange',
  });
  
  const emailForm = useForm<z.infer<typeof updateEmailSchema>>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: { newEmail: "", currentPassword: "" },
  });

  const passwordForm = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    loginForm.reset();
    registerForm.reset();
  }, [activeTab, loginForm, registerForm]);
  
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        toast({
          title: t('loggedOut'),
          description: t('loggedOutSuccessfully'),
        });
      });
    }
  };

  const handleLogin = (values: z.infer<typeof loginSchema>) => {
    if (!auth) return;
    initiateEmailSignIn(auth, values.email, values.password);
    toast({
      title: t('loading'),
      description: t('attemptingLogin'),
    });
  };
  
  const handleRegister = (values: z.infer<typeof registerSchema>) => {
    if (!auth) return;
    initiateEmailSignUp(auth, values.email, values.password);
    toast({
      title: t('loading'),
      description: t('attemptingRegister'),
    });
  };

  const handleGuestLogin = () => {
    if (!auth) return;
    initiateAnonymousSignIn(auth);
    toast({
        title: t('loading'),
        description: t('attemptingGuestLogin'),
    });
  };

  const handleChangeEmail = async (values: z.infer<typeof updateEmailSchema>) => {
    if (!user || !user.email) return;

    setIsUpdating(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, values.newEmail);
      toast({
        title: t('emailUpdateSuccessTitle'),
        description: t('emailUpdateSuccessDescription'),
      });
      emailForm.reset();
    } catch (error: any) {
      console.error("Email update failed:", error);
      toast({
        variant: "destructive",
        title: t('emailUpdateErrorTitle'),
        description: error.code === 'auth/wrong-password' 
          ? t('wrongPasswordError') 
          : error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (values: z.infer<typeof updatePasswordSchema>) => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      await updatePassword(user, values.newPassword);
      toast({
        title: t('passwordUpdateSuccessTitle'),
        description: t('passwordUpdateSuccessDescription'),
      });
      passwordForm.reset();
    } catch (error: any) {
      console.error("Password update failed:", error);
       toast({
        variant: "destructive",
        title: t('passwordUpdateErrorTitle'),
        description: t('reauthenticationNeededError'),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isUserLoading) {
    return (
      <SheetContent side="bottom" className="rounded-t-lg">
        <SheetHeader>
          <SheetTitle className="text-center">{t('loading')}</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <p>{t('loading')}...</p>
        </div>
      </SheetContent>
    );
  }
  
  if (user) {
    return (
      <SheetContent side="bottom" className="h-auto overflow-y-auto rounded-t-lg">
        <SheetHeader>
          <SheetTitle className="text-center">{user.isAnonymous ? t('guest') : t('myProfile')}</SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-4">
          <p className="text-sm font-medium">{user.isAnonymous ? t('browsingAsGuest') : `${t('welcome')},` } <span className='font-mono text-muted-foreground'>{user.isAnonymous ? user.uid : user.email}</span></p>

          {!user.isAnonymous && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="change-email">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> {t('changeEmail')}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit(handleChangeEmail)} className="space-y-4 pt-2">
                      <FormField
                        control={emailForm.control}
                        name="newEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('newEmail')}</FormLabel>
                            <FormControl><Input type="email" placeholder="new.email@example.com" {...field} /></FormControl>
                            <FormMessage>{emailForm.formState.errors.newEmail && t(emailForm.formState.errors.newEmail.message)}</FormMessage>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={emailForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('currentPassword')}</FormLabel>
                             <div className="relative">
                              <FormControl><Input type={showPassword ? "text" : "password"} {...field} /></FormControl>
                               <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">
                                {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                              </button>
                            </div>
                            <FormMessage>{emailForm.formState.errors.currentPassword && t(emailForm.formState.errors.currentPassword.message)}</FormMessage>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isUpdating}>{isUpdating ? t('loading') : t('updateEmail')}</Button>                  </form>
                  </Form>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="change-password">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" /> {t('changePassword')}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                   <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4 pt-2">
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('newPassword')}</FormLabel>
                             <div className="relative">
                              <FormControl><Input type={showPassword ? "text" : "password"} {...field} /></FormControl>
                               <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">
                                {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                              </button>
                            </div>
                            <FormMessage>{passwordForm.formState.errors.newPassword && t(passwordForm.formState.errors.newPassword.message)}</FormMessage>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('confirmNewPassword')}</FormLabel>
                            <FormControl><Input type={showPassword ? "text" : "password"} {...field} /></FormControl>
                            <FormMessage>{passwordForm.formState.errors.confirmPassword && t(passwordForm.formState.errors.confirmPassword.message)}</FormMessage>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isUpdating}>{isUpdating ? t('loading') : t('updatePassword')}</Button>
                    </form>
                  </Form>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          <Button onClick={handleLogout} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            {t('logout')}
          </Button>
        </div>
      </SheetContent>
    );
  }


  return (
     <SheetContent side="bottom" className="rounded-t-lg">
       <SheetHeader>
          <SheetTitle className="text-center">
            {activeTab === 'login' ? t('login') : t('register')}
          </SheetTitle>
        </SheetHeader>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">{t('login')}</TabsTrigger>
          <TabsTrigger value="register">{t('register')}</TabsTrigger>
        </TabsList>
        <TabsContent value="login" className="pt-4">
          <div className="p-4">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('password')}</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input type={showPassword ? "text" : "password"} {...field} />
                          </FormControl>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full mt-4" disabled={!loginForm.formState.isValid}>{t('login')}</Button>
              </form>
            </Form>
          </div>
        </TabsContent>
        <TabsContent value="register" className="pt-4">
          <div className="p-4">
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('password')}</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input type={showPassword ? "text" : "password"} {...field} />
                          </FormControl>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <FormField
                    control={registerForm.control}
                    name="acceptPrivacy"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value as boolean}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            {t('acceptPrivacyLabel')} {' '}
                            <Sheet>
                              <SheetTrigger asChild>
                                <button className="text-primary underline">{t('privacyPolicy')}</button>
                              </SheetTrigger>
                              <PrivacyPolicySheetContent />
                            </Sheet>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full mt-4" disabled={!registerForm.formState.isValid}>{t('register')}</Button>
              </form>
            </Form>
          </div>
        </TabsContent>
      </Tabs>
      <div className="px-8 pb-4">
          <div className="relative">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-background px-2 text-xs text-muted-foreground">{t('or')}</span>
          </div>
          <Button variant="link" className="w-full mt-2" onClick={handleGuestLogin}>{t('continueAsGuest')}</Button>
      </div>
    </SheetContent>
  );
}


export function SettingsSheetContent({ 
  showClock, 
  onToggleClock, 
  showCaptions, 
  onToggleCaptions,
  quality,
  onQualityChange,
  qualityLevels,
  bufferSize,
  onBufferSizeChange
}: { 
  showClock: boolean, 
  onToggleClock: () => void, 
  showCaptions: boolean, 
  onToggleCaptions: () => void,
  quality: string,
  onQualityChange: (quality: string) => void,
  qualityLevels: { label: string; level: number }[],
  bufferSize: string,
  onBufferSizeChange: (size: string) => void
}) {
  const { user, isUserLoading } = useUser();
  const { t, language, setLanguage } = useTranslation();
  
  return (
    <SheetContent side="top" className="rounded-b-lg mt-2">
      <SheetHeader>
        <SheetTitle className="text-center">{t('settings')}</SheetTitle>
      </SheetHeader>
      <div className="p-4 flex flex-col h-full overflow-y-auto">
        <ul className="space-y-4 flex-grow">
          <li className="space-y-2">
            <p className="text-sm font-medium">{t('language')}</p>
            <div className="flex items-center gap-2">
              <Button onClick={() => setLanguage('de')} variant={language === 'de' ? 'default' : 'outline'} className="flex-1">
                {t('german')}
              </Button>
              <Button onClick={() => setLanguage('en')} variant={language === 'en' ? 'default' : 'outline'} className="flex-1">
                {t('english')}
              </Button>
               <Button onClick={() => setLanguage('ru')} variant={language === 'ru' ? 'default' : 'outline'} className="flex-1">
                {t('russian')}
              </Button>
            </div>
          </li>
          <li className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('showClock')}</span>
              <Switch checked={showClock} onCheckedChange={onToggleClock} />
          </li>
          <li className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('subtitles')}</span>
              <Switch checked={showCaptions} onCheckedChange={onToggleCaptions} />
          </li>
          <li className="space-y-2">
            <p className="text-sm font-medium">{t('quality')}</p>
            <Select onValueChange={onQualityChange} value={quality}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('quality')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t('auto')}</SelectItem>
                {qualityLevels.map((q) => (
                  <SelectItem key={q.level} value={String(q.level)}>{q.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </li>
           <li className="space-y-2">
            <p className="text-sm font-medium">{t('bufferSize')}</p>
            <RadioGroup value={bufferSize} onValueChange={onBufferSizeChange} className="grid grid-cols-2 gap-2">
              <div>
                <RadioGroupItem value="2" id="buffer-low" className="peer sr-only" />
                <Label htmlFor="buffer-low" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                  {t('buffer_low')}
                </Label>
              </div>
               <div>
                <RadioGroupItem value="5" id="buffer-medium" className="peer sr-only" />
                <Label htmlFor="buffer-medium" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                  {t('buffer_medium')}
                </Label>
              </div>
               <div>
                <RadioGroupItem value="10" id="buffer-high" className="peer sr-only" />
                <Label htmlFor="buffer-high" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                  {t('buffer_high')}
                </Label>
              </div>
               <div>
                <RadioGroupItem value="auto" id="buffer-auto" className="peer sr-only" />
                <Label htmlFor="buffer-auto" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                  {t('buffer_auto')}
                </Label>
              </div>
            </RadioGroup>
          </li>
          <li>
            <a href="mailto:snackingtv.beta@gmail.com" className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-accent w-full">
              <span className='flex items-center gap-2'><MessageSquareWarning className="h-5 w-5 text-muted-foreground" /> {t('bugReport')}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </a>
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
        <div className="text-center text-xs text-muted-foreground pt-4">
          Build ❤️ 1.0.55
        </div>
      </div>
    </SheetContent>
  );
}

export function SearchSheetContent({ onSearch, searchTerm }: { onSearch: (term: string) => void, searchTerm: string }) {
  const { t } = useTranslation();
  const [localSearch, setLocalSearch] = useState(searchTerm);

  const handleSearch = () => {
    onSearch(localSearch);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  return (
    <SheetContent side="top" className="h-auto rounded-b-lg mt-2">
      <SheetHeader>
        <SheetTitle className="text-center">{t('searchChannels')}</SheetTitle>
      </SheetHeader>
      <div className="p-4">
        <div className="flex w-full items-center space-x-2">
          <Input
            placeholder={t('searchPlaceholder')}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow"
          />
          <Button type="submit" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </SheetContent>
  );
}

const EpgProgramItem = ({ program, isCurrent }: { program: any; isCurrent: boolean }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isCurrent) {
      const updateProgress = () => {
        const now = Date.now();
        const start = new Date(program.start).getTime();
        const end = new Date(program.end).getTime();
        const duration = end - start;
        const elapsed = now - start;
        const calculatedProgress = Math.min(100, (elapsed / duration) * 100);
        setProgress(calculatedProgress);
      };
      
      updateProgress();
      const intervalId = setInterval(updateProgress, 60000); // Update every minute
      return () => clearInterval(intervalId);
    }
  }, [isCurrent, program.start, program.end]);

  return (
    <div className={`p-4 rounded-lg ${isCurrent ? 'bg-accent/20' : ''}`}>
      <div className="flex justify-between items-baseline">
        <h4 className={`font-semibold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>{program.title}</h4>
        <p className="text-xs text-muted-foreground">{new Date(program.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(program.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{program.description}</p>
      {isCurrent && (
        <div className="mt-2">
          <Progress value={progress} className="h-1" />
        </div>
      )}
    </div>
  );
};


export function EpgSheetContent({ video }: { video: Video }) {
  const { t } = useTranslation();
  const [epgData, setEpgData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Implement actual EPG fetching from video.epgUrl
    // For now, using placeholder data
    const fetchEpgData = () => {
      setIsLoading(true);
      setTimeout(() => {
        const now = new Date();
        const placeholderData = [
          {
            title: 'Past Program',
            description: 'This was on earlier.',
            start: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
            end: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
          },
          {
            title: 'Current Program',
            description: 'This is on right now. Enjoy the show!',
            start: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
            end: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
          },
          {
            title: 'Next Program',
            description: 'This is coming up next.',
            start: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
            end: new Date(now.getTime() + 90 * 60 * 1000).toISOString(),
          },
          {
            title: 'Future Program',
            description: 'This will be on later.',
            start: new Date(now.getTime() + 90 * 60 * 1000).toISOString(),
            end: new Date(now.getTime() + 150 * 60 * 1000).toISOString(),
          },
        ];
        setEpgData(placeholderData);
        setIsLoading(false);
      }, 1000);
    };

    fetchEpgData();
  }, [video]);
  
  const now = Date.now();
  const currentProgram = epgData?.find(p => new Date(p.start).getTime() <= now && new Date(p.end).getTime() > now);
  const upcomingPrograms = epgData?.filter(p => new Date(p.start).getTime() > now);

  return (
    <SheetContent side="bottom" className="h-[60vh] rounded-t-lg flex flex-col">
      <SheetHeader className="text-center pb-2">
        <SheetTitle>{t('epg')} - {video.title}</SheetTitle>
      </SheetHeader>
      <div className="flex-grow overflow-y-auto p-4">
        {isLoading && <p className="text-center text-muted-foreground">{t('loading')}...</p>}
        {!isLoading && !epgData && <p className="text-center text-muted-foreground">{t('noEpgData')}</p>}
        {!isLoading && epgData && (
          <div className="space-y-4">
            {currentProgram && <EpgProgramItem program={currentProgram} isCurrent={true} />}
            {upcomingPrograms && upcomingPrograms.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  {upcomingPrograms.map(p => <EpgProgramItem key={p.start} program={p} isCurrent={false} />)}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </SheetContent>
  );
}


export function VideoCard({ 
  video, 
  isActive, 
  onAddChannels, 
  onChannelSelect, 
  addedChannels, 
  isFavorite, 
  onToggleFavorite, 
  onProgressUpdate, 
  onDurationChange, 
  activeVideoRef, 
  localVideoItem, 
  showCaptions,
  videoQuality,
  onQualityLevelsChange,
  bufferSize,
}: VideoCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReactPlayer>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();
  const [bufferedPercent, setBufferedPercent] = useState(0);
  
  const { user, isUserLoading } = useUser();
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  
  // Swipe to seek state
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekSpeed, setSeekSpeed] = useState(0);
  const [wasPlayingBeforeSeek, setWasPlayingBeforeSeek] = useState(false);

  // Fullscreen state
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const handleShare = async () => {
    if (!video || !video.url) return;

    const channelData: M3uChannel = {
      name: video.title,
      logo: (addedChannels.find(c => c.url === video.url)?.logo) || `https://picsum.photos/seed/iptv${Math.random()}/64/64`,
      url: typeof video.url === 'string' ? video.url : '', // Ensure url is a string
      group: video.author || 'Shared'
    };
    
    if (!channelData.url) {
        toast({ variant: 'destructive', title: 'Cannot share local file' });
        return;
    }

    const encodedData = btoa(JSON.stringify(channelData));
    const shareLink = `${window.location.origin}${window.location.pathname}?channel=${encodedData}`;

    const shareData = {
      title: t('shareChannel'),
      text: `Schau mal, was ich auf SnackingTV gefunden habe: ${video.title}`,
      url: shareLink,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast({
          title: t('linkCopiedTitle'),
        });
      } catch (err) {
        // Silently fail if user cancels share sheet
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
          toast({
            variant: 'destructive',
            title: t('copyErrorTitle'),
            description: (err as Error).message
          });
        }
      }
    } else {
      // Fallback for desktop
      navigator.clipboard.writeText(shareLink).then(() => {
        toast({
          title: t('linkCopiedTitle'),
          description: t('linkCopiedDescription'),
        });
      }).catch(err => {
        console.error('Failed to copy link: ', err);
        toast({
          variant: 'destructive',
          title: t('copyErrorTitle'),
          description: t('copyErrorDescription'),
        });
      });
    }
  };

  useEffect(() => {
    if (isActive && localVideoItem) {
        const url = URL.createObjectURL(localVideoItem.url as any);
        setLocalVideoUrl(url);

        return () => {
            URL.revokeObjectURL(url);
            setLocalVideoUrl(null);
        };
    }
  }, [isActive, localVideoItem]);
  
  const sourceUrl = localVideoUrl || (isActive ? video.url : undefined);
  const isYoutubeOrTwitch = typeof sourceUrl === 'string' && (sourceUrl.includes('youtube.com') || sourceUrl.includes('twitch.tv'));


  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-radix-collection-item]') || target.closest('button') || target.closest('[data-progress-bar]') || isYoutubeOrTwitch) {
      return;
    }

    if (playerRef.current) {
       setIsPlaying(prev => !prev);
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
    const videoContainer = containerRef.current;
    videoContainer?.addEventListener('mousemove', handleInteraction);
    return () => {
      videoContainer?.removeEventListener('mousemove', handleInteraction);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [handleInteraction]);
  
  const handleTimeUpdate = (state: { played: number, playedSeconds: number, loaded: number, loadedSeconds: number }) => {
    onProgressUpdate(state.played * 100);
  };

  const handleDuration = (duration: number) => {
    onDurationChange(duration);
  };
  
  const handleProgress = (state: { loaded: number, loadedSeconds: number, played: number, playedSeconds: number }) => {
      setBufferedPercent(state.loaded * 100);
  };

  // Fullscreen logic
  const toggleFullScreen = useCallback(() => {
    const elem = containerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);
  
  useEffect(() => {
      if (isActive) {
          setIsPlaying(true);
      } else {
          setIsPlaying(false);
      }
  }, [isActive]);


  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className="relative w-full h-full bg-background flex items-center justify-center cursor-pointer"
        onClick={handleVideoClick}
      >
        <ReactPlayer
            ref={playerRef}
            url={sourceUrl}
            playing={isPlaying}
            loop={!isYoutubeOrTwitch}
            playsinline
            width="100%"
            height="100%"
            controls={isYoutubeOrTwitch}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onBuffer={() => setIsBuffering(true)}
            onBufferEnd={() => setIsBuffering(false)}
            onProgress={handleProgress}
            onDuration={handleDuration}
            onSeek={played => onProgressUpdate(played * 100)}
            config={{
                file: {
                    hlsOptions: {
                        maxBufferLength: bufferSize === 'auto' ? 30 : parseInt(bufferSize, 10),
                        maxMaxBufferLength: bufferSize === 'auto' ? 60 : parseInt(bufferSize, 10) * 2,
                    },
                    attributes: {
                        crossOrigin: 'anonymous',
                    },
                    tracks: showCaptions && video.subtitlesUrl ? [{
                        kind: 'subtitles',
                        src: video.subtitlesUrl,
                        srcLang: 'de',
                        default: true,
                        label: 'Deutsch',
                    }] : undefined
                },
                youtube: {
                    playerVars: {
                        showinfo: 0,
                        controls: 1,
                    },
                },
            }}
            style={{ objectFit: 'contain' }}
        />
        
        <div
          className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
            (showControls || !isPlaying) && !isYoutubeOrTwitch ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-4 pointer-events-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-14 w-14 flex-col gap-1 text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full" onClick={(e) => { e.stopPropagation(); typeof video.url === 'string' && onToggleFavorite(video.url); }}>
                      <Star size={32} className={`drop-shadow-lg transition-colors ${isFavorite ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{t('favorites')}</p>
                </TooltipContent>
              </Tooltip>
              
              <Sheet>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-14 w-14 flex-col gap-1 text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full">
                          <CalendarDays size={32} className="drop-shadow-lg" />
                      </Button>
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>{t('epg')}</p>
                  </TooltipContent>
                </Tooltip>
                <EpgSheetContent video={video} />
              </Sheet>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-14 w-14 flex-col gap-1 text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full" onClick={(e) => { e.stopPropagation(); handleShare(); }}>
                    <Share2 size={32} className="drop-shadow-lg" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{t('shareChannel')}</p>
                </TooltipContent>
              </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-14 w-14 flex-col gap-1 text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullScreen();
                  }}
                >
                  {isFullScreen ? <Minimize size={32} className="drop-shadow-lg" /> : <Maximize size={32} className="drop-shadow-lg" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{isFullScreen ? t('exitFullscreen') : t('fullscreen')}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            {isBuffering && (
              <div className="bg-black/50 rounded-full p-3 text-white text-xs">
                {t('loading')} {Math.floor(bufferedPercent)}%
              </div>
            )}
          </div>
        </div>

      </div>
    </TooltipProvider>
  );
}
