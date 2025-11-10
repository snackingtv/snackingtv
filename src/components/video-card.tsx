'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, ChevronRight, LogOut, Copy, Download, Plus, Tv2, Upload, Wifi, WifiOff, Star, Search, Folder, Trash2, ShieldCheck, X, Maximize, Minimize, Eye, EyeOff, Mic, User as UserIcon, KeyRound, Mail } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Video } from '@/lib/videos';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth, useFirestore, useUser, initiateEmailSignIn, initiateEmailSignUp } from '@/firebase';
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
import { WeatherAndDate } from './weather-and-date';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface VideoCardProps {
  video: Video;
  isActive: boolean;
  onAddChannels: (newChannels: M3uChannel[]) => void;
  onChannelSelect: (channel: M3uChannel | Video) => void;
  addedChannels: WithId<M3uChannel>[];
  isFavorite: boolean;
  onToggleFavorite: (channelUrl: string) => void;
  onSearch: (term: string) => void;
  searchTerm: string;
  localVideoItem: Video | null;
  onLocalVideoSelect: (file: File) => void;
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

function ChannelListSheetContent({ 
  channels, 
  onChannelSelect,
  favoriteChannels,
  title,
}: { 
  channels: WithId<M3uChannel>[]; 
  onChannelSelect: (channel: M3uChannel) => void;
  favoriteChannels: WithId<M3uChannel>[];
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
  
  const handleSelectAll = (channelList: WithId<M3uChannel>[]) => {
      const allIds = channelList.map(c => c.id);
      if(selectedChannels.size === allIds.length) {
          setSelectedChannels(new Set());
      } else {
          setSelectedChannels(new Set(allIds));
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

  const allOtherChannels = channels.filter(c => !favoriteChannels.find(f => f.url === c.url));

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
    <SheetContent side="bottom" className="h-[60vh]">
      <SheetHeader className="text-center">
        <div className="relative flex justify-center items-center">
          <SheetTitle className="flex-grow text-center">{title}</SheetTitle>
          {channels.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                setIsManaging(!isManaging);
                setSelectedChannels(new Set());
              }}
              className="absolute right-0"
            >
              {isManaging ? t('done') : t('manage')}
            </Button>
          )}
        </div>
      </SheetHeader>
      <div className="p-4 overflow-y-auto h-[calc(100%-80px)]">
        {channels.length > 0 ? (
          <Accordion type="multiple" defaultValue={['favorites', 'all-channels']} className="w-full">
            <AccordionItem value="favorites">
              <AccordionTrigger>{t('favorites')}</AccordionTrigger>
              <AccordionContent>
                {renderChannelList(favoriteChannels, t('noFavorites'))}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="all-channels">
              <AccordionTrigger>{t('allChannels')}</AccordionTrigger>
              <AccordionContent>
                {renderChannelList(allOtherChannels, t('noOtherChannels'))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          <p className="text-muted-foreground text-center">{t('noChannels')}</p>
        )}
      </div>
      {isManaging && (
        <div className="absolute bottom-0 left-0 right-0 bg-background border-t p-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Checkbox id="select-all" onCheckedChange={() => handleSelectAll(channels)} checked={selectedChannels.size > 0 && selectedChannels.size === channels.length} />
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

function AddChannelSheetContent({ onAddChannel, user, isUserLoading }: { onAddChannel?: (channels: M3uChannel[]) => void, user: User | null, isUserLoading: boolean }) {
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
    
    // 1. Fetch existing channel URLs for the user
    const q = query(userChannelsRef, where('userId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    const existingUrls = new Set(querySnapshot.docs.map(doc => doc.data().url));

    // 2. Filter out channels that already exist
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

    // 3. Add only the new channels
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

  if (verifiedChannels.length > 0) {
    return (
      <SheetContent side="bottom" className="h-[75vh] flex flex-col">
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
    <SheetContent side="bottom" className="h-auto">
      <SheetHeader>
        <SheetTitle>{t('addChannel')}</SheetTitle>
      </SheetHeader>
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
                <Button onClick={handleAddFromUrl} disabled={!user || isDisabled || !channelLink}>
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


function AuthSheetContent({ initialTab = 'login' }: { initialTab?: 'login' | 'register' }) {
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
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{t('loading')}</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <p>{t('loading')}...</p>
        </div>
      </SheetContent>
    );
  }
  
  if (user) {
    return (
      <SheetContent side="bottom" className="h-auto overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('myProfile')}</SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-4">
          <p className="text-sm font-medium">{t('welcome')}, <span className='font-mono text-muted-foreground'>{user.email}</span></p>

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

          <Button onClick={handleLogout} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            {t('logout')}
          </Button>
        </div>
      </SheetContent>
    );
  }


  return (
     <SheetContent side="bottom">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">{t('login')}</TabsTrigger>
          <TabsTrigger value="register">{t('register')}</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <SheetHeader>
            <SheetTitle>{t('login')}</SheetTitle>
          </SheetHeader>
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
        <TabsContent value="register">
          <SheetHeader>
            <SheetTitle>{t('register')}</SheetTitle>
          </SheetHeader>
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
    </SheetContent>
  );
}


function SettingsSheetContent() {
  const { user, isUserLoading } = useUser();
  const { t, language, setLanguage } = useTranslation();
  
  return (
    <SheetContent side="bottom">
      <SheetHeader>
        <SheetTitle>{t('settings')}</SheetTitle>
      </SheetHeader>
      <div className="p-4 flex flex-col h-full">
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
        <div className="text-center text-xs text-muted-foreground pt-4">
          Build 1.0.9
        </div>
      </div>
    </SheetContent>
  );
}

function SearchSheetContent({ onSearch, searchTerm }: { onSearch: (term: string) => void, searchTerm: string }) {
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
    <SheetContent side="bottom" className="h-auto">
      <SheetHeader>
        <SheetTitle>{t('searchChannels')}</SheetTitle>
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


export function VideoCard({ video, isActive, onAddChannels, onChannelSelect, addedChannels, isFavorite, onToggleFavorite, onSearch, searchTerm, localVideoItem, onLocalVideoSelect }: VideoCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState('');
  
  const { user, isUserLoading } = useUser();
  const localVideoInputRef = useRef<HTMLInputElement>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  
  // Swipe to seek state
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekSpeed, setSeekSpeed] = useState(0);
  const [wasPlayingBeforeSeek, setWasPlayingBeforeSeek] = useState(false);

  // Progress bar state
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Fullscreen state
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const favoriteChannels = addedChannels.filter(channel => isFavorite);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCurrentTime(timeString);
    };
    
    updateClock();
    const timerId = setInterval(updateClock, 1000);

    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (isActive && localVideoItem) {
        // We assume localVideoItem.url is a File object from the input
        const url = URL.createObjectURL(localVideoItem.url as any);
        setLocalVideoUrl(url);

        return () => {
            URL.revokeObjectURL(url);
            setLocalVideoUrl(null);
        };
    }
  }, [isActive, localVideoItem]);


  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const sourceUrl = localVideoUrl || (isActive ? video.url : null);
    
    // Reset progress when source changes
    setProgress(0);
    setDuration(0);

    if (sourceUrl) {
        if (videoElement.currentSrc !== sourceUrl) {
            videoElement.src = sourceUrl;
            videoElement.load();
        }
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
            playPromise.then(() => setIsPlaying(true)).catch((error) => {
                if (error.name !== 'AbortError') {
                    console.error("Video play failed:", error);
                    videoElement.muted = true;
                    videoElement.play().then(() => setIsPlaying(true)).catch(err => {
                        console.error("Muted video play also failed:", err);
                        setIsPlaying(false);
                    });
                }
            });
        }
    } else {
        videoElement.pause();
        videoElement.removeAttribute('src');
        videoElement.load();
        setIsPlaying(false);
    }
}, [isActive, video.url, localVideoUrl]);

  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // Check if the click was on the splash screen to trigger fullscreen and start
    const splash = document.getElementById('splash-screen');
    if (splash && splash.contains(e.target as Node)) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        }
        // This should be handled by the splash screen component itself now
        return; 
    }

    if (isSeeking) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-radix-collection-item]') || target.closest('button') || target.closest('[data-progress-bar]')) {
      return;
    }

    if (videoRef.current && (video.url || localVideoUrl)) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name !== 'AbortError') {
              console.error("Manual play failed:", error);
            }
          });
        }
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

  const handleLocalFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onLocalVideoSelect(file);
    }
    event.target.value = '';
  };
  
  // --- Swipe to Seek Handlers ---
  const initialSeekX = useRef(0);
  const rewindInterval = useRef<NodeJS.Timeout | null>(null);

  const handleSeekStart = (clientX: number) => {
    const videoEl = videoRef.current;
    if (!videoEl || videoEl.duration === Infinity || !videoEl.src) return;

    setIsSeeking(true);
    const wasPlaying = !videoEl.paused;
    setWasPlayingBeforeSeek(wasPlaying);
    if(wasPlaying) {
      const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            // Ignore AbortError which can happen if pause() is called right after.
            if(e.name !== 'AbortError') console.error(e)
          });
        }
    }
    initialSeekX.current = clientX;
  };

  const handleSeekMove = (clientX: number) => {
    if (!isSeeking || !videoRef.current) return;
  
    const videoEl = videoRef.current;
    const swipeDelta = clientX - initialSeekX.current;
    
    // Softer acceleration
    const speedRatio = Math.min(Math.abs(swipeDelta) / (videoEl.clientWidth / 2), 1); // Ratio of swipe distance to half of video width
    let speed;
    if (speedRatio < 0.25) speed = 2;
    else if (speedRatio < 0.5) speed = 4;
    else if (speedRatio < 0.75) speed = 8;
    else speed = 16;
    
    if (rewindInterval.current) clearInterval(rewindInterval.current);
  
    if (swipeDelta > 10) { // Fast-forward
      setSeekSpeed(speed);
      videoEl.playbackRate = speed;
    } else if (swipeDelta < -10) { // Rewind
      setSeekSpeed(-speed);
      if(!videoEl.paused) videoEl.pause();
      const rewindAmount = 0.1 * (speed / 2); // Rewind speed is a bit slower
      rewindInterval.current = setInterval(() => {
        videoEl.currentTime = Math.max(0, videoEl.currentTime - rewindAmount);
      }, 100);
    } else {
      setSeekSpeed(0);
      videoEl.playbackRate = 1;
    }
  };

  const handleSeekEnd = () => {
    if (!isSeeking) return;

    if (rewindInterval.current) clearInterval(rewindInterval.current);
    rewindInterval.current = null;
    
    const videoEl = videoRef.current;
    if (videoEl) {
        videoEl.playbackRate = 1;
        // Restore previous play state
        if(wasPlayingBeforeSeek && videoEl.paused) {
            const playPromise = videoEl.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => { if (e.name !== 'AbortError') console.error(e) });
            }
        } else if (!wasPlayingBeforeSeek && !videoEl.paused) {
           videoEl.pause();
        }
    }
    setIsSeeking(false);
    setSeekSpeed(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleSeekStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleSeekMove(e.touches[0].clientX);
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    handleSeekStart(e.clientX);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    handleSeekMove(e.clientX);
  };
  
  // Progress bar logic
  const handleTimeUpdate = () => {
    if (videoRef.current && !isNaN(videoRef.current.duration)) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressContainer = progressContainerRef.current;
    const videoElement = videoRef.current;
    if (!progressContainer || !videoElement || isNaN(videoElement.duration)) return;
  
    const rect = progressContainer.getBoundingClientRect();
    const clickPositionX = e.clientX - rect.left;
    const clickRatio = clickPositionX / rect.width;
    const newTime = clickRatio * videoElement.duration;
  
    videoElement.currentTime = newTime;
    setProgress(clickRatio * 100);
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

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className="relative w-full h-full bg-black flex items-center justify-center cursor-pointer"
        onClick={handleVideoClick}
        onMouseLeave={handleSeekEnd} 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleSeekEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleSeekEnd}
      >
        <video
          ref={videoRef}
          loop
          playsInline
          className="w-full h-full object-contain"
          onPlay={() => {
              if (!isSeeking) setIsPlaying(true);
              handleInteraction();
          }}
          onPause={() => {
              if (!isSeeking) setIsPlaying(false);
              handleInteraction();
          }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          muted={false} 
        />
        {isSeeking && seekSpeed !== 0 && (
            <div className="absolute bottom-16 right-6 p-2 bg-black/50 text-white rounded-md font-mono text-lg" style={{textShadow: '1px 1px 2px black'}}>
                {seekSpeed > 0 ? `FWD ${seekSpeed}x` : `REW ${Math.abs(seekSpeed)}x`}
            </div>
        )}

        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            showControls || !isPlaying || isSeeking ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-6 flex justify-between items-center gap-2 text-white">
            <div className='flex flex-col'>
              <div className="font-headline text-2xl font-bold" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
                {currentTime}
              </div>
              <WeatherAndDate />
            </div>

            <div className="flex items-center gap-2">
              <Sheet>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-12 w-12 flex-shrink-0">
                        <Search size={28} className="drop-shadow-lg"/>
                      </Button>
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('searchChannels')}</p>
                  </TooltipContent>
                </Tooltip>
                <SearchSheetContent onSearch={onSearch} searchTerm={searchTerm} />
              </Sheet>

              <Sheet>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-12 w-12 flex-shrink-0">
                        <Plus size={28} className="drop-shadow-lg" />
                      </Button>              
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('addChannel')}</p>
                  </TooltipContent>
                </Tooltip>
                <AddChannelSheetContent onAddChannel={onAddChannels} user={user} isUserLoading={isUserLoading} />
              </Sheet>
              
              <Sheet>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-12 w-12 flex-shrink-0">
                        <UserIcon size={28} className="drop-shadow-lg"/>
                      </Button>
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{user ? t('profile') : t('login')}</p>
                  </TooltipContent>
                </Tooltip>
                <AuthSheetContent />
              </Sheet>
              
              <Sheet>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-12 w-12 flex-shrink-0">
                        <Settings size={28} className="drop-shadow-lg"/>
                      </Button>
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('settings')}</p>
                  </TooltipContent>
                </Tooltip>
                <SettingsSheetContent />
              </Sheet>
            </div>
          </div>

          <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-14 w-14 flex-col gap-1 text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full" onClick={(e) => { e.stopPropagation(); onToggleFavorite(video.url); }}>
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
                      <Tv2 size={32} className="drop-shadow-lg" />
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{t('channels')}</p>
                </TooltipContent>
              </Tooltip>
              <ChannelListSheetContent channels={addedChannels} onChannelSelect={onChannelSelect} favoriteChannels={favoriteChannels} title={t('channels')} />
            </Sheet>
            
            <input
              type="file"
              ref={localVideoInputRef}
              onChange={handleLocalFileChange}
              accept="video/*"
              className="hidden"
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-14 w-14 flex-col gap-1 text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    localVideoInputRef.current?.click();
                  }}
                >
                  <Folder size={32} className="drop-shadow-lg" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{t('deviceStorage')}</p>
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


          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {!isPlaying && (video.url || localVideoUrl) && (
              <div className="pointer-events-auto">
                
              </div>
            )}
          </div>
          
          <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 space-y-3">
            <div
                data-progress-bar
                ref={progressContainerRef}
                className="w-full h-2.5 cursor-pointer group"
                onClick={handleProgressClick}
              >
                <Progress
                  value={progress}
                  className="h-1 group-hover:h-2.5 transition-all duration-200"
                />
            </div>
            <div className="text-white text-shadow-lg" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
              <h3 className="font-bold text-lg">{video.author}</h3>
              <p className="text-base">{video.title}</p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
