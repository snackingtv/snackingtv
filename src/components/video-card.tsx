'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, ChevronRight, LogOut, Copy, Download, Heart, MessageCircle, Share2, Tv2 } from 'lucide-react';
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

interface VideoCardProps {
  video: Video;
  avatarUrl: string;
  isActive: boolean;
}

function PrivacyPolicySheetContent() {
  return (
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x h-3/4">
      <SheetHeader>
        <SheetTitle>Privacy Policy</SheetTitle>
      </SheetHeader>
      <div className="p-4 overflow-y-auto h-full">
        <div className="space-y-4">
          <p>
            Your privacy is important to us. It is our policy to respect your
            privacy regarding any information we may collect from you across our
            website.
          </p>
          <h2 className="text-2xl font-semibold">1. Information we collect</h2>
          <p>
            We only ask for personal information when we truly need it to provide a
            service to you. We collect it by fair and lawful means, with your
            knowledge and consent. We also let you know why we’re collecting it and
            how it will be used.
          </p>

          <h2 className="text-2xl font-semibold">2. How we use your information</h2>
          <p>
            We only retain collected information for as long as necessary to
            provide you with your requested service. What data we store, we’ll
            protect within commercially acceptable means to prevent loss and
            theft, as well as unauthorized access, disclosure, copying, use or
            modification.
          </p>

          <h2 className="text-2xl font-semibold">3. Cookies</h2>
          <p>
            We use cookies to improve your experience on our site. By using our
            site, you consent to our use of cookies.
          </p>

          <h2 className="text-2xl font-semibold">4. Links to other sites</h2>
          <p>
            Our website may link to external sites that are not operated by us.
            Please be aware that we have no control over the content and
            practices of these sites, and cannot accept responsibility or
            liability for their respective privacy policies.
          </p>
          <p>
            Your continued use of our website will be regarded as acceptance of
            our practices around privacy and personal information. If you have any
            questions about how we handle user data and personal information, feel
            free to contact us.
          </p>
          <p>This policy is effective as of 1 August 2024.</p>
        </div>
      </div>
    </SheetContent>
  )
}

function ImprintSheetContent() {
  return (
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x h-3/4">
      <SheetHeader>
        <SheetTitle>Imprint</SheetTitle>
      </SheetHeader>
      <div className="p-4 overflow-y-auto h-full">
        <div className="space-y-4">
          <p>SnackingTV Inc.</p>
          <p>123 Snack Street</p>
          <p>Food City, 98765</p>
          <p>United States</p>

          <h2 className="text-2xl font-semibold mt-6">Contact</h2>
          <p>Email: contact@snacking.tv</p>
          <p>Phone: +1 (555) 123-4567</p>

          <h2 className="text-2xl font-semibold mt-6">Represented by</h2>
          <p>John Doe, CEO</p>

          <h2 className="text-2xl font-semibold mt-6">Register entry</h2>
          <p>Registered in the commercial register.</p>
          <p>Register court: Delaware</p>
          <p>Registration number: 12345678</p>
        </div>
      </div>
    </SheetContent>
  )
}

function ChannelListSheetContent() {
  // Dummy channel data
  const channels = [
    { id: 1, name: 'Kanal 1', logo: 'https://picsum.photos/seed/ch1/64/64' },
    { id: 2, name: 'Kanal 2', logo: 'https://picsum.photos/seed/ch2/64/64' },
    { id: 3, name: 'Kanal 3', logo: 'https://picsum.photos/seed/ch3/64/64' },
    { id: 4, name: 'Kanal 4', logo: 'https://picsum.photos/seed/ch4/64/64' },
    { id: 5, name: 'Kanal 5', logo: 'https://picsum.photos/seed/ch5/64/64' },
    { id: 6, name: 'Kanal 6', logo: 'https://picsum.photos/seed/ch6/64/64' },
    { id: 7, name: 'Kanal 7', logo: 'https://picsum.photos/seed/ch7/64/64' },
    { id: 8, name: 'Kanal 8', logo: 'https://picsum.photos/seed/ch8/64/64' },
  ];

  return (
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x h-[60vh]">
      <SheetHeader>
        <SheetTitle>Kanäle</SheetTitle>
      </SheetHeader>
      <div className="p-4 overflow-y-auto h-full">
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
      </div>
    </SheetContent>
  );
}


function SettingsSheetContent() {
  const [anonymousIdInput, setAnonymousIdInput] = useState('');
  const { toast } = useToast();
  const auth = useAuth();
  
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
    
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          updateLocalUser(firebaseUser);
          if (firebaseUser.isAnonymous) {
             toast({
              title: "Angemeldet!",
              description: "Du bist jetzt anonym angemeldet.",
            });
          } else {
            toast({
              title: "Angemeldet!",
              description: "Du bist jetzt angemeldet.",
            });
          }
        } else if (!localStorage.getItem('manualUser')) {
          updateLocalUser(null);
        }
      });
      return () => unsubscribe();
    }
  }, [auth, toast]);

  const handleLogout = () => {
    const performLogout = () => {
      localStorage.removeItem('manualUser');
      setLocalUser(null);
      toast({
        title: "Abgemeldet",
        description: "Du wurdest erfolgreich abgemeldet.",
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
        title: "Kopiert!",
        description: "Deine anonyme ID wurde in die Zwischenablage kopiert.",
      });
    }
  };

  const handleSaveAsPdf = () => {
    if (localUser) {
      const doc = new jsPDF();
      doc.text("SnackingTV - Anonyme Benutzer-ID", 10, 10);
      doc.text("Bitte bewahre diese ID sicher auf, um auf anderen Geräten auf dein Konto zuzugreifen.", 10, 20);
      doc.setFont('courier');
      doc.text(localUser.uid, 10, 30);
      doc.save("snacking-tv-user-id.pdf");
      toast({
        title: "PDF gespeichert!",
        description: "Deine Benutzer-ID wurde als PDF gespeichert.",
      });
    }
  };
  
  const handleManualSignIn = (id: string) => {
    if (!id.trim()) {
      toast({
        variant: "destructive",
        title: "Ungültige ID",
        description: "Bitte gebe eine gültige Benutzer-ID ein.",
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
        title: "Mit ID angemeldet",
        description: `Du verwendest jetzt die anonyme ID: ${id}`,
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
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="p-4">Laden...</div>
      </SheetContent>
    )
  }

  return (
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x">
      <SheetHeader>
        <SheetTitle>Einstellungen</SheetTitle>
      </SheetHeader>
      <div className="p-4">
        <ul className="space-y-4">
          {localUser ? (
            <li className="space-y-2">
              <p className="text-sm font-medium">Deine anonyme ID</p>
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
                Abmelden
              </Button>
            </li>
          ) : (
            <li>
              <div className="space-y-2">
                <p className="text-sm font-medium">Anmelden</p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Bestehende anonyme ID eingeben" 
                    value={anonymousIdInput}
                    onChange={(e) => setAnonymousIdInput(e.target.value)}
                    className="flex-grow"
                  />
                  <Button onClick={() => handleManualSignIn(anonymousIdInput)} disabled={!anonymousIdInput} variant={anonymousIdInput ? "default" : "outline"}>
                    Los
                  </Button>
                </div>
                <Button onClick={handleNewAnonymousProfile} variant="link" className="p-0 h-auto text-sm">
                  Oder erstelle ein neues anonymes Profil
                </Button>
              </div>
            </li>
          )}
          <li>
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-accent w-full">
                  <span>Datenschutz-Bestimmungen</span>
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
                  <span>Impressum</span>
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
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                <Settings size={24} />
              </Button>
            </SheetTrigger>
            <SettingsSheetContent />
          </Sheet>
        </div>

        <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-4 text-white">
           <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-12 w-12 flex-col gap-1 text-white hover:bg-white/20 hover:text-white">
                  <Tv2 size={24} />
                </Button>
              </SheetTrigger>
              <ChannelListSheetContent />
            </Sheet>
        </div>


        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!isPlaying && (
            <div className="pointer-events-auto">
              
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
          <div className="space-y-3 pointer-events-none text-white w-full max-w-[calc(100%-80px)]">
            <div className="flex items-center gap-3">
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
    </div>
  );
}
