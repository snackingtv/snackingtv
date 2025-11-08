'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, ChevronRight, LogOut, Copy, Download, Plus, Tv2, Upload, Wifi, WifiOff, Star, Search, Folder, Trash2, ShieldCheck, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Video } from '@/lib/videos';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { Input } from '@/components/ui/input';
import { signOut, User, onAuthStateChanged } from 'firebase/auth';
import { jsPDF } from 'jspdf';
import { useTranslation } from '@/lib/i18n';
import { fetchM3u } from '@/ai/flows/m3u-proxy-flow';
import { checkChannelStatus } from '@/ai/flows/check-channel-status-flow';
import { parseM3u, type M3uChannel } from '@/lib/m3u-parser';
import { Separator } from './ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';
import { WithId } from '@/firebase/firestore/use-collection';
import { Checkbox } from '@/components/ui/checkbox';
import { deleteChannels } from '@/firebase/firestore/deletions';

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

function ChannelListSheetContent({ 
  channels, 
  onChannelSelect,
  favoriteChannels,
  title
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
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x h-[60vh]">
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

function AddChannelSheetContent({ onAddChannel, user, isUserLoading }: { onAddChannel: (channels: M3uChannel[]) => void, user: User | null, isUserLoading: boolean }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const [channelLink, setChannelLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef(false);
  const onlineChannelsRef = useRef<M3uChannel[]>([]);


  const processM3uContent = async (content: string, source: string) => {
    if (isUserLoading) {
      toast({
        title: t('loading'),
        description: "Please wait a moment while we set up your profile.",
      });
      return false;
    }
    
    // This is the critical check. We need to wait for the user to be loaded.
    if (!user) {
        toast({
            variant: 'destructive',
            title: t('notLoggedInTitle'),
            description: t('notLoggedInDescription'),
        });
        return false;
    }

    isCancelledRef.current = false;
    onlineChannelsRef.current = [];
    setIsLoading(true);
    setIsVerifying(true);
    setVerificationProgress(0);
    setOnlineCount(0);
    setOfflineCount(0);
    setTotalCount(0);

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

    const userChannelsRef = collection(firestore, 'user_channels');

    let checkedCount = 0;

    for (const channel of parsedChannels) {
      if (isCancelledRef.current) break; // Check for cancellation
      try {
        const result = await checkChannelStatus({ url: channel.url });
        if (result.online) {
          onlineChannelsRef.current.push(channel);
          setOnlineCount(c => c + 1);

          // Save to Firestore
          addDocumentNonBlocking(userChannelsRef, {
            ...channel,
            userId: user.uid,
            addedAt: serverTimestamp(),
          });
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
    
    const finalOnlineChannels = onlineChannelsRef.current;

    if (isCancelledRef.current) {
        if (finalOnlineChannels.length > 0) {
             toast({
                title: t('channelAddedTitle'),
                description: t('channelAddedDescription', { count: finalOnlineChannels.length }),
            });
        } else {
             toast({
                title: t('verificationCancelledTitle'),
                description: t('verificationCancelledDescription'),
            });
        }
    } else if (finalOnlineChannels.length > 0) {
      toast({
        title: t('channelAddedTitle'),
        description: t('channelAddedDescription', { count: finalOnlineChannels.length }),
      });
    } else {
       toast({
        variant: 'destructive',
        title: t('noOnlineChannelsTitle'),
        description: t('noOnlineChannelsDescription'),
      });
    }
    
    setIsLoading(false);
    setIsVerifying(false);
    return finalOnlineChannels.length > 0;
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
  };
  
  const isDisabled = isUserLoading || isLoading;

  return (
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x h-auto">
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
                  disabled={isDisabled}
                  className="flex-grow"
                />
                <Button onClick={handleAddFromUrl} disabled={isDisabled || !channelLink}>
                  {isUserLoading ? t('loading') : isLoading ? t('loading') : t('add')}
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
                disabled={isDisabled}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
                disabled={isDisabled}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUserLoading ? t('loading') : t('uploadFile')}
              </Button>
            </div>
          </>
        )}
      </div>
    </SheetContent>
  );
}


function SettingsSheetContent({ user, onUserChange }: { user: User | null, onUserChange: (user: User | null) => void }) {
  const [anonymousIdInput, setAnonymousIdInput] = useState('');
  const { toast } = useToast();
  const auth = useAuth();
  const { t, language, setLanguage } = useTranslation();
  
  const handleLogout = () => {
    if (auth) {
      signOut(auth);
    }
    // For manual/non-firebase user, just clear it
    onUserChange(null);
    localStorage.removeItem('manualUser');
    toast({
      title: t('loggedOut'),
      description: t('loggedOutSuccessfully'),
    });
  };

  const handleCopy = () => {
    if (user) {
      navigator.clipboard.writeText(user.uid);
      toast({
        title: t('copied'),
        description: t('anonymousIdCopied'),
      });
    }
  };

  const handleSaveAsPdf = () => {
    if (user) {
      const doc = new jsPDF();
      doc.text(t('pdfTitle'), 10, 10);
      doc.text(t('pdfNotice'), 10, 20);
      doc.setFont('courier');
      doc.text(user.uid, 10, 30);
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
    // This is a "fake" user object for manual sign in
    const manualUser = { uid: id.trim(), isAnonymous: true } as unknown as User;
    onUserChange(manualUser);
    localStorage.setItem('manualUser', JSON.stringify(manualUser));
    
    // If a firebase user is logged in, log them out
    if(auth && auth.currentUser) {
      signOut(auth);
    }
    
    toast({
        title: t('loggedInWithId'),
        description: t('nowUsingAnonymousId', {id: id.trim()}),
    });
  }

  const handleNewAnonymousProfile = () => {
    if (auth) {
      // Clear manual user before initiating new Firebase anonymous sign-in
      localStorage.removeItem('manualUser');
      onUserChange(null); // Clear local state first
      initiateAnonymousSignIn(auth)
          .then(userCredential => {
              // The onAuthStateChanged listener will handle the global state,
              // but we can update the local state here for immediate UI feedback if needed.
              if (userCredential?.user) {
                  onUserChange(userCredential.user);
                  toast({
                      title: t('loggedIn'),
                      description: t('nowLoggedInAnonymously'),
                  });
              }
          })
          .catch((error) => {
              console.error("Anonymous sign-in error:", error);
          });
    }
  }
  
  return (
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x">
      <SheetHeader>
        <SheetTitle>{t('settings')}</SheetTitle>
      </SheetHeader>
      <div className="p-4">
        <ul className="space-y-4">
          {user ? (
            <li className="space-y-2">
              <p className="text-sm font-medium">{t('yourAnonymousId')}</p>
              <div className="flex items-center gap-2">
                <p className="flex-grow text-xs text-muted-foreground p-2 bg-muted rounded-md font-mono break-all">{user.uid}</p>
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

function SearchSheetContent({ onSearch, searchTerm }: { onSearch: (term: string) => void, searchTerm: string }) {
  const { t } = useTranslation();
  return (
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x h-auto">
      <SheetHeader>
        <SheetTitle>{t('searchChannels')}</SheetTitle>
      </SheetHeader>
      <div className="p-4">
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full"
        />
      </div>
    </SheetContent>
  );
}


export function VideoCard({ video, isActive, onAddChannels, onChannelSelect, addedChannels, isFavorite, onToggleFavorite, onSearch, searchTerm }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState('');
  
  const [isClient, setIsClient] = useState(false);
  const { user: firebaseUser, isUserLoading } = useUser();
  const [currentUser, setCurrentUser] = useState<User | null>(firebaseUser);


  useEffect(() => {
    setIsClient(true);
    // Check for a manually logged-in user from localStorage on initial load
    const manualUserStr = localStorage.getItem('manualUser');
    if (manualUserStr) {
        try {
            setCurrentUser(JSON.parse(manualUserStr));
        } catch (e) {
            console.error("Failed to parse manual user from localStorage", e);
        }
    }
  }, []);

  useEffect(() => {
    // This effect synchronizes the currentUser with the user from the Firebase hook.
    // If a manual user is logged out, firebaseUser will become the source of truth.
    setCurrentUser(firebaseUser);
  }, [firebaseUser]);
  
  const { toast } = useToast();
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
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isActive && video.url && video.url.startsWith('http')) {
      try {
        const videoUrl = new URL(video.url);
        videoUrl.searchParams.set('v', `${Date.now()}`);
        videoElement.src = videoUrl.toString();

        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch((error) => {
              console.error("Video play failed:", error);
              // Muted autoplay is usually allowed. Try playing muted.
              videoElement.muted = true;
              videoElement.play().then(() => setIsPlaying(true)).catch(err => {
                console.error("Muted video play also failed:", err);
                setIsPlaying(false);
              });
            });
        }
      } catch (error) {
        console.error("Invalid video URL:", video.url, error);
        videoElement.src = '';
        setIsPlaying(false);
      }
    } else {
      videoElement.pause();
      videoElement.currentTime = 0;
      videoElement.src = '';
      setIsPlaying(false);
    }
  }, [isActive, video.url]);
  

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const { currentTime, duration } = videoRef.current;
      if (duration > 0) {
        // setProgress((currentTime / duration) * 100);
      }
    }
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // Prevent toggling play/pause when clicking on interactive elements
    if ((e.target as HTMLElement).closest('[data-radix-collection-item]') || (e.target as HTMLElement).closest('button')) {
      return;
    }

    if (videoRef.current && video.url) {
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

  if (!isClient) {
    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center">
            {/* You can show a loading spinner here */}
        </div>
    );
  }

  return (
    <div
      className="relative w-full h-full bg-black flex items-center justify-center cursor-pointer"
      onClick={handleVideoClick}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        loop
        playsInline
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => handleInteraction()}
        onPause={() => handleInteraction()}
        muted={false} 
      />

      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-6 flex justify-between items-center gap-2 text-white">
          <div className="font-headline text-2xl font-bold" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
            {currentTime}
          </div>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-12 w-12 flex-shrink-0">
                  <Search size={28} className="drop-shadow-lg"/>
                </Button>
              </SheetTrigger>
              <SearchSheetContent onSearch={onSearch} searchTerm={searchTerm} />
            </Sheet>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-12 w-12 flex-shrink-0" disabled={isUserLoading}>
                  <Plus size={28} className="drop-shadow-lg" />
                </Button>
              </SheetTrigger>
              <AddChannelSheetContent onAddChannel={onAddChannels} user={currentUser} isUserLoading={isUserLoading} />
            </Sheet>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-12 w-12 flex-shrink-0">
                  <Settings size={28} className="drop-shadow-lg"/>
                </Button>
              </SheetTrigger>
              <SettingsSheetContent user={currentUser} onUserChange={setCurrentUser} />
            </Sheet>
          </div>
        </div>

        <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-4">
             <Button variant="ghost" size="icon" className="h-14 w-14 flex-col gap-1 text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full" onClick={(e) => { e.stopPropagation(); onToggleFavorite(video.url); }}>
                <Star size={32} className={`drop-shadow-lg transition-colors ${isFavorite ? 'text-yellow-400 fill-yellow-400' : ''}`} />
            </Button>
           <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-14 w-14 flex-col gap-1 text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full">
                  <Tv2 size={32} className="drop-shadow-lg" />
                </Button>
              </SheetTrigger>
              <ChannelListSheetContent channels={addedChannels} onChannelSelect={onChannelSelect} favoriteChannels={favoriteChannels} title={t('channels')} />
            </Sheet>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-14 w-14 flex-col gap-1 text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full">
                  <Folder size={32} className="drop-shadow-lg" />
                </Button>
              </SheetTrigger>
              <ChannelListSheetContent channels={addedChannels} onChannelSelect={onChannelSelect} favoriteChannels={favoriteChannels} title={t('library')} />
            </Sheet>
        </div>


        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!isPlaying && video.url && (
            <div className="pointer-events-auto">
              
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
