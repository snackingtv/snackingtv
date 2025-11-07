'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, ChevronRight, LogOut, Copy, Download, Heart, MessageCircle, Share2, Tv2 } from 'lucide-react';
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

function SettingsSheetContent() {
  const [anonymousIdInput, setAnonymousIdInput] = useState('');
  const { toast } = useToast();
  const auth = useAuth();
  
  // A local state to manage the user object for immediate UI updates
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
    
    // On component mount, check localStorage for a persisted manual user
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
          toast({
            title: "Logged In",
            description: "You are now logged in.",
          });
        } else if (!localStorage.getItem('manualUser')) {
          // If no firebase user and no manual user, then logged out
          updateLocalUser(null);
        }
      });
      return () => unsubscribe(); // Cleanup subscription
    }
  }, [auth, toast]);

  const handleLogout = () => {
    const performLogout = () => {
      localStorage.removeItem('manualUser');
      setLocalUser(null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    };

    if (auth && auth.currentUser) {
      signOut(auth).then(performLogout);
    } else {
      performLogout();
    }
  };


  const handleCopy = () => {
    if (localUser) {
      navigator.clipboard.writeText(localUser.uid);
      toast({
        title: "Copied!",
        description: "Your anonymous ID has been copied to the clipboard.",
      });
    }
  };

  const handleSaveAsPdf = () => {
    if (localUser) {
      const doc = new jsPDF();
      doc.text("SnackingTV - Anonymous User ID", 10, 10);
      doc.text("Please keep this ID safe to access your account on other devices.", 10, 20);
      doc.setFont('courier');
      doc.text(localUser.uid, 10, 30);
      doc.save("snacking-tv-user-id.pdf");
      toast({
        title: "PDF Saved!",
        description: "Your user ID has been saved as a PDF.",
      });
    }
  };
  
  const handleManualSignIn = (id: string) => {
    if (!id.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid ID",
        description: "Please enter a valid user ID.",
      });
      return;
    }
    const fakeUser = { uid: id, isAnonymous: true };
    localStorage.setItem('manualUser', JSON.stringify(fakeUser));
    setLocalUser(fakeUser);
    
    // If there's an active firebase user, sign them out.
    if(auth && auth.currentUser) {
      signOut(auth);
    }
    
    toast({
        title: "Logged in with ID",
        description: `You are now using the anonymous ID: ${id}`,
    });
  }

  const handleNewAnonymousProfile = () => {
    if (auth) {
      localStorage.removeItem('manualUser'); // Clean up any manual user
      initiateAnonymousSignIn(auth);
      // The onAuthStateChanged listener will handle setting the localUser and showing the toast.
    }
  }
  
  if (!isClient) {
    return (
      <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="p-4">Loading...</div>
      </SheetContent>
    )
  }

  return (
    <SheetContent side="bottom" className="rounded-t-lg max-w-2xl mx-auto border-x">
      <SheetHeader>
        <SheetTitle>Settings</SheetTitle>
      </SheetHeader>
      <div className="p-4">
        <ul className="space-y-4">
          {localUser ? (
            <li className="space-y-2">
              <p className="text-sm font-medium">Your Anonymous ID</p>
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
                Logout
              </Button>
            </li>
          ) : (
            <li>
              <div className="space-y-2">
                <p className="text-sm font-medium">Log in</p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter existing anonymous ID" 
                    value={anonymousIdInput}
                    onChange={(e) => setAnonymousIdInput(e.target.value)}
                    className="flex-grow"
                  />
                  <Button onClick={() => handleManualSignIn(anonymousIdInput)} disabled={!anonymousIdInput} variant={anonymousIdInput ? "default" : "outline"}>
                    Go
                  </Button>
                </div>
                <Button onClick={handleNewAnonymousProfile} variant="link" className="p-0 h-auto text-sm">
                  Or create a new anonymous profile
                </Button>
              </div>
            </li>
          )}
          <li>
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-accent w-full">
                  <span>Privacy Policy</span>
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
                  <span>Imprint</span>
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
    // Prevent click from propagating to the video if it's on the sheet trigger
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
        } flex flex-col justify-between p-4 md:p-6`}
      >
        <div className="flex justify-end">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white m-2">
                <Settings size={24} />
              </Button>
            </SheetTrigger>
            <SettingsSheetContent />
          </Sheet>
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!isPlaying && (
            <div className="pointer-events-auto">
              
            </div>
          )}
        </div>

        <div className="flex justify-between items-end">
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

          <div className="flex flex-col items-center space-y-4 text-white">
            <Button variant="ghost" size="icon" className="h-12 w-12 flex-col gap-1 text-white hover:bg-white/20 hover:text-white">
              <Tv2 size={24} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
