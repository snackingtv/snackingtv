'use client';

import React, { useState, useRef, useEffect, useCallback, MutableRefObject } from 'react';
import { Settings, ChevronRight, LogOut, Copy, Download, Plus, Tv2, Upload, Wifi, WifiOff, Star, Search, Folder, Trash2, ShieldCheck, X, Maximize, Minimize, Eye, EyeOff, Mic, User as UserIcon, KeyRound, Mail, Clock, Share2, Loader, Captions, MessageSquareWarning, CalendarDays, Link as LinkIcon, FileText, Info, Play, ChevronUp, ChevronDown, Pause, Volume2, VolumeX, Sparkles, HardDrive } from 'lucide-react';
import Image from 'next/image';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import Link from 'next/link';
import { useLocalVideoStore } from '@/lib/local-video-store';

interface VideoCardProps {
  video: Video | M3uChannel;
  isActive: boolean;
  addedChannels: WithId<M3uChannel>[];
  isFavorite: boolean;
  onToggleFavorite: (channelUrl: string) => void;
  onProgressUpdate: (progress: number) => void;
  onDurationChange: (duration: number) => void;
  activeVideoRef: MutableRefObject<ReactPlayer | null>;
  localVideoItem: Video | null;
  showCaptions: boolean;
  onToggleCaptions: () => void;
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

function TermsOfServiceSheetContent() {
    const { t } = useTranslation();
    return (
        <SheetContent side="bottom" className="h-[90vh] rounded-t-lg mx-2 mb-2 flex flex-col">
            <SheetHeader>
                <SheetTitle>{t('termsOfServiceTitle')}</SheetTitle>
            </SheetHeader>
            <div className="p-4 overflow-y-auto flex-grow">
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">{t('termsOfServiceH2_1')}</h2>
                    <p>{t('termsOfServiceP1')}</p>

                    <h2 className="text-2xl font-semibold">{t('termsOfServiceH2_2')}</h2>
                    <p>{t('termsOfServiceP2')}</p>

                    <h2 className="text-2xl font-semibold">{t('termsOfServiceH2_3')}</h2>
                    <p>{t('termsOfServiceP3')}</p>

                    <h2 className="text-2xl font-semibold">{t('termsOfServiceH2_4')}</h2>
                    <p>{t('termsOfServiceP4')}</p>
                    
                    <h2 className="text-2xl font-semibold">{t('termsOfServiceH2_5')}</h2>
                    <p>{t('termsOfServiceP5')}</p>
                </div>
            </div>
             <div className="p-4 border-t border-border mt-auto">
                <div className="text-center text-xs text-muted-foreground">
                    Build ❤️ 1.1.25
                </div>
            </div>
        </SheetContent>
    );
}

function PrivacyPolicySheetContent() {
  const { t } = useTranslation();
  return (
    <SheetContent side="bottom" className="h-[90vh] rounded-t-lg mx-2 mb-2 flex flex-col">
      <SheetHeader>
        <SheetTitle>{t('privacyPolicyTitle')}</SheetTitle>
      </SheetHeader>
      <div className="p-4 overflow-y-auto flex-grow">
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
      <div className="p-4 border-t border-border mt-auto">
        <div className="text-center text-xs text-muted-foreground">
            Build ❤️ 1.1.25
        </div>
      </div>
    </SheetContent>
  )
}

function ImprintSheetContent() {
  const { t } = useTranslation();
  return (
    <SheetContent side="bottom" className="h-[90vh] rounded-t-lg mx-2 mb-2 flex flex-col">
      <SheetHeader>
        <SheetTitle>{t('imprintTitle')}</SheetTitle>
      </SheetHeader>
      <div className="p-4 overflow-y-auto flex-grow">
        <div className="space-y-4">
          <p>Tivio Inc.</p>
          <p>123 Snack Street</p>
          <p>Food City, 98765</p>
          <p>United States</p>

          <h2 className="text-2xl font-semibold mt-6">{t('imprintContact')}</h2>
          <p>Email: contact@tivio.tv</p>
          <p>Phone: +1 (555) 123-4567</p>

          <h2 className="text-2xl font-semibold mt-6">{t('imprintRepresentedBy')}</h2>
          <p>John Doe, CEO</p>

          <h2 className="text-2xl font-semibold mt-6">{t('imprintRegisterEntry')}</h2>
          <p>{t('imprintRegisterCourt')}</p>
          <p>{t('imprintRegisterNumber')}</p>
        </div>
      </div>
       <div className="p-4 border-t border-border mt-auto">
        <div className="text-center text-xs text-muted-foreground">
            Build ❤️ 1.1.25
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
    <SheetContent side="bottom" className="h-[90vh] rounded-t-lg mx-2 mb-2 flex flex-col">
      <SheetHeader className="text-center">
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>
      <div className="p-4 overflow-y-auto flex-grow">
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
                <Button variant="destructive" size="icon" onClick={() => onToggleFavorite(channel.url)}>
                  <Trash2 className="h-5 w-5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-center py-4">{t('noFavorites')}</p>
        )}
      </div>
      <div className="p-4 border-t border-border mt-auto">
        <div className="text-center text-xs text-muted-foreground">
            Build ❤️ 1.1.25
        </div>
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
  const [searchTerm, setSearchTerm] = useState('');

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
  
  const handleSelectAll = (filteredChannels: WithId<M3uChannel>[]) => {
      const allFilteredIds = filteredChannels.map(c => c.id);
      const allSelected = allFilteredIds.every(id => selectedChannels.has(id)) && selectedChannels.size === allFilteredIds.length;

      if(allSelected) {
          setSelectedChannels(prev => {
              const newSelection = new Set(prev);
              allFilteredIds.forEach(id => newSelection.delete(id));
              return newSelection;
          });
      } else {
          setSelectedChannels(prev => new Set([...prev, ...allFilteredIds]));
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
  
  const filteredChannels = channels.filter(channel => 
      channel.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <p className="text-muted-foreground text-center py-4">{searchTerm ? t('noResultsFound') : emptyMessage}</p>
    );
  };

  return (
    <SheetContent side="bottom" className="h-[90vh] rounded-t-lg mx-2 mb-2 flex flex-col">
      <SheetHeader className="text-center px-4 pt-4 pb-4">
        <div className="grid grid-cols-3 items-center pb-4">
          <div className="flex justify-start">
            {channels.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setIsManaging(!isManaging);
                  setSelectedChannels(new Set());
                }}
                className="w-24 text-center justify-center"
              >
                {isManaging ? t('done') : t('manage')}
              </Button>
            )}
          </div>
          <SheetTitle className="text-center">{title}</SheetTitle>
          <div />
        </div>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                placeholder={t('searchChannels')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
        </div>
      </SheetHeader>
      <div className="flex-grow overflow-y-auto p-4">
         {renderChannelList(filteredChannels, t('noChannels'))}
      </div>
      {isManaging && (
        <div className="border-t p-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Checkbox 
                  id="select-all" 
                  onCheckedChange={() => handleSelectAll(filteredChannels)} 
                  checked={filteredChannels.length > 0 && filteredChannels.every(c => selectedChannels.has(c.id))}
                  aria-label={t('selectAll')}
                />
                <label htmlFor="select-all" className="text-sm font-medium">{t('selectAll')}</label>
            </div>
            <Button variant="destructive" onClick={handleDeleteSelected} disabled={selectedChannels.size === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('deleteSelected', { count: selectedChannels.size })}
            </Button>
        </div>
      )}
      {!isManaging && <div className="p-4 border-t border-border mt-auto">
        <div className="text-center text-xs text-muted-foreground">
            Build ❤️ 1.1.25
        </div>
      </div>}
    </SheetContent>
  );
}

export function AddChannelSheetContent({ user, isUserLoading, trigger }: { user: User | null, isUserLoading: boolean, trigger?: React.ReactNode }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [channelLink, setChannelLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef(false);
  const onlineChannelsRef = useRef<M3uChannel[]>([]);
  
  // TOS State
  const [isTosDialogOpen, setIsTosDialogOpen] = useState(false);
  const [onTosAccepted, setOnTosAccepted] = useState<(() => void) | null>(null);

  const checkTos = (callback: () => void) => {
    if (localStorage.getItem('tosAccepted') === 'true') {
      callback();
    } else {
      setOnTosAccepted(() => callback);
      setIsTosDialogOpen(true);
    }
  };

  const handleAcceptTos = () => {
    localStorage.setItem('tosAccepted', 'true');
    setIsTosDialogOpen(false);
    if (onTosAccepted) {
      onTosAccepted();
    }
    setOnTosAccepted(null);
  };
  
  const resetVerificationState = () => {
    setIsVerifying(false);
    setVerificationProgress(0);
    setOnlineCount(0);
    setOfflineCount(0);
    setTotalCount(0);
    onlineChannelsRef.current = [];
    isCancelledRef.current = false;
  };

  const processM3uContent = async (content: string, sourceType: 'URL' | 'file') => {
    try {
        const parsedChannels = parseM3u(content);
        if (parsedChannels.length === 0) {
            toast({
                variant: 'destructive',
                title: t('noChannelsFoundTitle'),
                description: t('noChannelsFoundDescription'),
            });
            setIsLoading(false);
            return;
        }
        await verifyChannels(parsedChannels);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: t('channelAddErrorTitle'),
            description: error.message || t('channelAddErrorDescription'),
        });
        setIsLoading(false);
    }
  };

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

  const verifyChannels = async (channels: M3uChannel[]) => {
    resetVerificationState();
    setIsVerifying(true);
    setTotalCount(channels.length);
    
    toast({
      title: t('checkingChannelsTitle'),
      description: t('checkingChannelsDescription', { count: channels.length }),
    });
    
    let checkedCount = 0;
    
    for (const channel of channels) {
      if (isCancelledRef.current) break; 
      try {
        const result = await checkChannelStatus({ url: channel.url });
        if (result.online) {
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
          setVerificationProgress(Math.round((checkedCount / channels.length) * 100));
        }
      }
    }
    
    setIsVerifying(false);

    if (isCancelledRef.current) {
       toast({
          title: t('verificationCancelledTitle'),
          description: t('verificationCancelledDescription'),
      });
    } else {
       toast({
        title: t('verificationCompleteTitle'),
        description: t('verificationCompleteDescription', { count: onlineChannelsRef.current.length }),
      });
    }
    
    if (onlineChannelsRef.current.length > 0) {
      const addedCount = await handleSaveChannels(onlineChannelsRef.current);
      if (addedCount > 0) {
         toast({
          title: t('channelAddedTitle'),
          description: t('channelAddedDescription', { count: addedCount }),
        });
      }
    } else if (!isCancelledRef.current) {
       toast({
        variant: 'destructive',
        title: t('noOnlineChannelsTitle'),
        description: t('noOnlineChannelsDescription'),
      });
    }
    
    setIsLoading(false);
  };
  
  const handleAddFromUrl = () => {
    checkTos(async () => {
      const link = channelLink;
      if (!link) {
        toast({ variant: 'destructive', title: t('invalidLinkTitle'), description: t('invalidLinkDescription') });
        return;
      }
  
      const cleanedLink = link.split(' ')[0].trim();
  
      const isM3u = cleanedLink.toLowerCase().endsWith('.m3u') || cleanedLink.toLowerCase().endsWith('.m3u8');
  
      if (!isM3u && !cleanedLink.startsWith('http')) {
        toast({ variant: 'destructive', title: t('invalidLinkTitle'), description: t('invalidLinkDescription') });
        return;
      }
  
      setIsLoading(true);

      if (!isM3u) {
         const newChannel: M3uChannel = {
          name: cleanedLink,
          logo: `https://picsum.photos/seed/iptv${Math.random()}/64/64`,
          url: cleanedLink,
          group: 'Direct Link'
        };
        const addedCount = await handleSaveChannels([newChannel]);
        if (addedCount > 0) {
          toast({ title: t('channelAddedTitle'), description: t('channelAddedDescription', { count: addedCount }) });
          setChannelLink('');
        }
        setIsLoading(false);
        return;
      }
  
      // Assume it's a playlist URL (M3U/M3U8)
      try {
        const m3uContent = await fetchM3u({ url: cleanedLink });
        if (!m3uContent) {
          toast({ variant: 'destructive', title: t('channelAddErrorTitle'), description: t('channelAddErrorDescription') });
          setIsLoading(false);
          return;
        }
        await processM3uContent(m3uContent, 'URL');
        setChannelLink('');
      } catch (error) {
        console.error("Failed to add channel from URL:", error);
        toast({ variant: 'destructive', title: t('channelAddErrorTitle'), description: t('channelAddErrorDescription') });
        setIsLoading(false);
      }
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    checkTos(() => {
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
    });
  }

  const handleCancelVerification = () => {
    isCancelledRef.current = true;
    setIsVerifying(false);
    setIsLoading(false);
  };
  
  if (isVerifying) {
    return (
      <SheetContent side="bottom" className="h-auto rounded-t-lg mx-2 mb-2">
        <SheetHeader>
          <SheetTitle className="text-center">{t('checkingChannelsTitle')}</SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-4 text-center">
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
      </SheetContent>
    );
  }

  const isDisabled = isUserLoading || isLoading;
  
  const content = (
    <>
      <SheetHeader>
          <SheetTitle className="text-center">{t('addChannel')}</SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-4">
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
              <Button onClick={handleAddFromUrl} disabled={!user || isDisabled || !channelLink}>
                {isLoading ? <Loader className="animate-spin" /> : t('add')}
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-background px-2 text-sm text-muted-foreground">{t('or')}</span>
          </div>

          <div className='flex flex-col space-y-2'>
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
              {isLoading && !isVerifying ? <Loader className="animate-spin mr-2" /> : <Upload className="mr-2 h-4 w-4" />}
              {t('uploadFile')}
            </Button>
          </div>
        </div>
        <div className="p-4 border-t border-border">
          <div className="text-center text-xs text-muted-foreground">
              Build ❤️ 1.1.25
          </div>
        </div>
    </>
  );

  return (
    <>
      {trigger ? (
         <Sheet>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent side="bottom" className="h-auto rounded-t-lg mx-2 mb-2">
              {content}
            </SheetContent>
         </Sheet>
      ) : (
         <SheetContent side="bottom" className="h-auto rounded-t-lg mx-2 mb-2">
           {content}
         </SheetContent>
      )}
      
      <AlertDialog open={isTosDialogOpen} onOpenChange={setIsTosDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tosConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tosConfirmDescription')}{' '}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="link" className="p-0 h-auto">{t('readTermsOfService')}</Button>
                </SheetTrigger>
                <TermsOfServiceSheetContent />
              </Sheet>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsTosDialogOpen(false)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptTos}>{t('tosAcceptAndContinue')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
  const { t, language, setLanguage } = useTranslation();
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

  const languageSelector = (
    <div className="px-4 py-2 space-y-2">
      <p className="text-sm font-medium text-center text-muted-foreground">{t('language')}</p>
      <Select onValueChange={(value) => setLanguage(value as 'de' | 'en' | 'ru')} value={language}>
        <SelectTrigger>
          <SelectValue placeholder={t('language')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="de">{t('german')}</SelectItem>
          <SelectItem value="en">{t('english')}</SelectItem>
          <SelectItem value="ru">{t('russian')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (isUserLoading) {
    return (
      <SheetContent side="bottom" className="rounded-t-lg mx-2 mb-2">
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
      <SheetContent side="bottom" className="h-auto overflow-y-auto rounded-t-lg mx-2 mb-2 flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-center">{user.isAnonymous ? t('guest') : t('myProfile')}</SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-4 flex-grow">
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
                      <Button type="submit" className="w-full" disabled={isUpdating}>{isUpdating ? <Loader className="animate-spin" /> : t('updateEmail')}</Button>                  </form>
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
                      <Button type="submit" className="w-full" disabled={isUpdating}>{isUpdating ? <Loader className="animate-spin" /> : t('updatePassword')}</Button>
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
        <div className="p-4 border-t border-border mt-auto">
          {languageSelector}
          <div className="text-center text-xs text-muted-foreground mt-2">
              Build ❤️ 1.1.25
          </div>
        </div>
      </SheetContent>
    );
  }


  return (
      <SheetContent side="bottom" className="rounded-t-lg mx-2 mb-2 flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-center">
            {activeTab === 'login' ? t('login') : t('register')}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto">
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
                    <FormField
                      control={registerForm.control}
                      name="acceptPrivacy"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              id="acceptPrivacy"
                            />
                          </FormControl>
                          <div className="grid gap-1.5 leading-none">
                            <label htmlFor="acceptPrivacy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              {t('acceptPrivacyLabel')}{' '}
                              <Sheet>
                                <SheetTrigger asChild>
                                  <button type="button" className="text-primary underline">{t('privacyPolicy')}</button>
                                </SheetTrigger>
                                <PrivacyPolicySheetContent />
                              </Sheet>
                            </label>
                             <FormMessage>{registerForm.formState.errors.acceptPrivacy && t(registerForm.formState.errors.acceptPrivacy.message as string)}</FormMessage>
                          </div>
                        </FormItem>
                      )}
                    />
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
        </div>
         <div className="p-4 border-t border-border mt-auto">
          {languageSelector}
          <div className="text-center text-xs text-muted-foreground mt-2">
              Build ❤️ 1.1.25
          </div>
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isClearCacheDialogOpen, setIsClearCacheDialogOpen] = useState(false);
  const clearLocalVideoFile = useLocalVideoStore((state) => state.clearFile);


  const handleClearCache = () => {
    try {
      localStorage.clear();
      clearLocalVideoFile();
      toast({
        title: t('cacheClearedTitle'),
        description: t('cacheClearedDescription'),
      });
      // Use a short delay to allow the toast to be seen before reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('cacheClearErrorTitle'),
        description: t('cacheClearErrorDescription'),
      });
    }
    setIsClearCacheDialogOpen(false);
  };
  
  return (
    <>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-center">{t('settings')}</SheetTitle>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto p-4">
          <ul className="space-y-4">
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
              <a href="mailto:tivio.beta@gmail.com" className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-accent w-full">
                <span className='flex items-center gap-2'><MessageSquareWarning className="h-5 w-5 text-muted-foreground" /> {t('bugReport')}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
            </li>
            <li>
              <Sheet>
                  <SheetTrigger asChild>
                      <button className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-accent w-full">
                          <span className='flex items-center gap-2'><FileText className="h-5 w-5 text-muted-foreground" /> {t('termsOfService')}</span>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </button>
                  </SheetTrigger>
                  <TermsOfServiceSheetContent />
              </Sheet>
            </li>
            <li>
              <Sheet>
                <SheetTrigger asChild>
                  <button className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-accent w-full">
                    <span className='flex items-center gap-2'><ShieldCheck className="h-5 w-5 text-muted-foreground" /> {t('privacyPolicy')}</span>
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
                    <span className='flex items-center gap-2'><Info className="h-5 w-5 text-muted-foreground" /> {t('imprint')}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                </SheetTrigger>
                <ImprintSheetContent />
              </Sheet>
            </li>
          </ul>
        </div>
        <div className="p-4 flex flex-col items-center gap-4 mt-auto">
          <button onClick={() => setIsClearCacheDialogOpen(true)} className="flex items-center justify-center p-3 rounded-lg hover:bg-destructive/10 w-full text-destructive">
            <span className='flex items-center gap-2'><Trash2 className="h-5 w-5" /> {t('clearCache')}</span>
          </button>
          <Separator className="my-2" />
          <div className="text-center text-xs text-muted-foreground">
            Build ❤️ 1.1.25
          </div>
        </div>
      </SheetContent>
      <AlertDialog open={isClearCacheDialogOpen} onOpenChange={setIsClearCacheDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clearCacheConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clearCacheConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsClearCacheDialogOpen(false)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCache} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('clearCacheConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatTime(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  if (hh) {
    return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
  }
  return `${mm}:${ss}`;
}


export function VideoCard({ 
  video, 
  isActive, 
  addedChannels, 
  isFavorite, 
  onToggleFavorite, 
  onProgressUpdate, 
  onDurationChange, 
  activeVideoRef, 
  localVideoItem, 
  showCaptions,
  onToggleCaptions,
  videoQuality,
  onQualityLevelsChange,
  bufferSize,
}: VideoCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();
  
  const { user, isUserLoading } = useUser();
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  
  // Fullscreen state
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const { toast } = useToast();
  
  const isPlaceholder = 'id' in video && video.id === 'placeholder';

  // Player state for local controls
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const isLocalVideo = !!localVideoItem;

  const handleShare = async () => {
    if (!video || !video.url || typeof video.url !== 'string') {
        toast({ variant: 'destructive', title: 'Cannot share local file' });
        return;
    }

    const channelData: M3uChannel = {
      name: video.title,
      logo: (addedChannels.find(c => c.url === video.url)?.logo) || `https://picsum.photos/seed/iptv${Math.random()}/64/64`,
      url: video.url,
      group: ('author' in video ? video.author : 'group' in video ? video.group : 'Shared') || 'Shared',
    };

    const encodedData = encodeURIComponent(JSON.stringify(channelData));
    const shareLink = `${window.location.origin}/player?channel=${encodedData}`;

    const shareData = {
      title: t('shareChannel'),
      text: `Schau mal, was ich auf Tivio gefunden habe: ${video.title}`,
      url: shareLink,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast({
          title: t('linkCopiedTitle'),
        });
      } catch (err) {
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
    if (isActive && localVideoItem && localVideoItem.url instanceof File) {
        const url = URL.createObjectURL(localVideoItem.url);
        setLocalVideoUrl(url);
        setPlayed(0);
        setDuration(0);
        return () => {
            URL.revokeObjectURL(url);
            setLocalVideoUrl(null);
        };
    }
  }, [isActive, localVideoItem]);
  
  const sourceUrl = localVideoUrl || (isActive && typeof video.url === 'string' ? video.url : undefined);
  const isYoutubeOrTwitch = typeof sourceUrl === 'string' && (sourceUrl.includes('youtube.com') || sourceUrl.includes('twitch.tv'));

  const handleInteraction = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // Let clicks on controls pass through
    const target = e.target as HTMLElement;
    if (target.closest('.player-controls') || isPlaceholder) {
      return;
    }
    handleInteraction();
    setIsPlaying(prev => !prev);
  };

  useEffect(() => {
    const videoContainer = containerRef.current;
    videoContainer?.addEventListener('mousemove', handleInteraction);
    // No click listener here to avoid double toggling play/pause
    return () => {
      videoContainer?.removeEventListener('mousemove', handleInteraction);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [handleInteraction]);
  
  const handleProgress = (state: { played: number, playedSeconds: number, loaded: number, loadedSeconds: number }) => {
      onProgressUpdate(state.played * 100);
      setPlayed(state.played);
  };
  
  const handleDuration = (newDuration: number) => {
    onDurationChange(newDuration);
    setDuration(newDuration);
  };

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
          handleInteraction();
      } else {
          setIsPlaying(false);
          setPlayed(0);
      }
  }, [isActive, handleInteraction]);


  const handleSeek = (value: number) => {
    if (activeVideoRef.current) {
      activeVideoRef.current.seekTo(value, 'fraction');
      setPlayed(value);
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    setIsMuted(value === 0);
  };

  const handleMuteToggle = () => {
    setIsMuted(prev => !prev);
  };
  
  const handlePlayPause = () => {
    setIsPlaying(p => !p);
  };

  const shouldShowOverlay = (showControls || !isPlaying) && !isYoutubeOrTwitch;


  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn(
          'relative w-full h-full bg-black flex items-center justify-center overflow-hidden group/player',
          !shouldShowOverlay && isPlaying && !isPlaceholder ? 'cursor-none' : 'cursor-pointer'
        )}
        onClick={handleVideoClick}
      >
        {isPlaceholder ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center text-white p-8">
              <div className="absolute z-10 p-4 bg-black/50 rounded-lg text-center">
                  <h2 className="text-2xl font-bold mb-4">{t('noChannelsAvailable')}</h2>
                   <AddChannelSheetContent user={user} isUserLoading={isUserLoading} trigger={
                      <Button><Plus className="mr-2 h-4 w-4" /> {t('addChannel')}</Button>
                    } />
              </div>
          </div>
        ) : (
          <ReactPlayer
              ref={activeVideoRef}
              url={sourceUrl}
              playing={isPlaying}
              loop={!isYoutubeOrTwitch && !isLocalVideo}
              playsinline
              width="100%"
              height="100%"
              controls={isYoutubeOrTwitch}
              volume={volume}
              muted={isMuted}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onBuffer={() => setIsBuffering(true)}
              onBufferEnd={() => setIsBuffering(false)}
              onProgress={handleProgress}
              onDuration={handleDuration}
              onSeek={p => setPlayed(p)}
              config={{
                  file: {
                      hlsOptions: {
                          maxBufferLength: bufferSize === 'auto' ? 30 : parseInt(bufferSize, 10),
                          maxMaxBufferLength: bufferSize === 'auto' ? 60 : parseInt(bufferSize, 10) * 2,
                      },
                      attributes: {
                          crossOrigin: 'anonymous',
                      },
                      tracks: showCaptions && 'subtitlesUrl' in video && video.subtitlesUrl ? [{
                          kind: 'subtitles',
                          src: video.subtitlesUrl,
                          srcLang: 'de',
                          default: true,
                          label: 'Deutsch',
                      }] : [],
                  },
                  youtube: {
                      playerVars: {
                          showinfo: 0,
                          controls: 1,
                      },
                  },
              }}
              style={{ objectFit: 'contain', pointerEvents: 'none' }}
          />
        )}
        
        {/* Overlays and Controls */}
        {!isYoutubeOrTwitch && !isPlaceholder && (
          <div
            className="absolute inset-0"
          >
              {/* Center Play/Pause Button & Buffering Spinner */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {isBuffering && (
                  <div className="text-white">
                    <Loader className="animate-spin h-12 w-12" />
                  </div>
                )}
                {!isPlaying && !isBuffering && (
                  <button
                    className="pointer-events-auto rounded-full bg-black/50 p-4 transition-transform hover:scale-110"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPause();
                    }}
                  >
                    <Play
                      className="h-16 w-16 text-white drop-shadow-lg"
                      fill="currentColor"
                    />
                  </button>
                )}
              </div>

              {/* Control Bar */}
              <div
                className={cn(
                  'player-controls absolute bottom-0 left-0 right-0 p-3 pb-4 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300',
                  shouldShowOverlay ? 'opacity-100' : 'opacity-0'
                )}
                onClick={e => e.stopPropagation()}
              >
                  <div className="flex flex-col gap-2">
                    {/* Progress Bar */}
                    <div className="group/progress relative flex items-center">
                        <Slider
                            min={0}
                            max={0.999999}
                            step={0.0001}
                            value={[played]}
                            onValueChange={(value) => handleSeek(value[0])}
                            className="w-full h-1 group-hover/progress:h-2 transition-all duration-200"
                        />
                    </div>
                  
                    {/* Main Controls */}
                    <div className="flex items-center justify-between gap-4 text-white">
                      {/* Left Controls */}
                      <div className="flex items-center gap-3">
                        <button onClick={handlePlayPause}>
                          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </button>
                        <div className="flex items-center gap-2 group/volume">
                          <button onClick={handleMuteToggle}>
                            {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                          </button>
                          <div className="w-0 group-hover/volume:w-24 transition-all duration-200">
                             <Slider
                                min={0}
                                max={1}
                                step={0.05}
                                value={[isMuted ? 0 : volume]}
                                onValueChange={handleVolumeChange}
                            />
                          </div>
                        </div>
                        <div className="text-xs font-mono select-none">
                          {formatTime(played * duration)} / {formatTime(duration)}
                        </div>
                      </div>

                      {/* Right Controls */}
                      <div className="flex items-center gap-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-auto w-auto p-2 text-white hover:bg-white/20 hover:text-white" onClick={(e) => { e.stopPropagation(); if (typeof video.url === 'string') onToggleFavorite(video.url); }}>
                                  <Star size={20} className={`drop-shadow-lg transition-colors ${isFavorite ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>{t('favorites')}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-auto w-auto p-2 text-white hover:bg-white/20 hover:text-white" onClick={(e) => { e.stopPropagation(); handleShare(); }}>
                                <Share2 size={20} className="drop-shadow-lg" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>{t('shareChannel')}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Sheet>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SheetTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-auto w-auto p-2 text-white hover:bg-white/20 hover:text-white">
                                    <Settings size={20} className="drop-shadow-lg"/>
                                  </Button>
                                </SheetTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>{t('settings')}</p>
                              </TooltipContent>
                            </Tooltip>
                            <SettingsSheetContent
                              showClock={false} // Clock is handled on parent page
                              onToggleClock={() => {}} // Dummy function
                              showCaptions={showCaptions}
                              onToggleCaptions={onToggleCaptions}
                              quality={videoQuality}
                              onQualityChange={() => {}} // This should be handled in parent
                              qualityLevels={qualityLevels}
                              bufferSize={bufferSize}
                              onBufferSizeChange={() => {}} // This should be handled in parent
                            />
                          </Sheet>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost" size="icon" className="h-auto w-auto p-2 text-white hover:bg-white/20 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFullScreen();
                              }}
                            >
                              {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>{isFullScreen ? t('exitFullscreen') : t('fullscreen')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
              </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
