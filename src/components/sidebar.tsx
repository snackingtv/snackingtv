'use client';

import { PlusCircle, Tv2, Folder, User as UserIcon, Star, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { SheetContent, SheetHeader, SheetTitle, SheetTrigger, Sheet } from '@/components/ui/sheet';
import { AddChannelSheetContent, AuthSheetContent } from './video-card';
import { M3uChannel } from '@/lib/m3u-parser';
import { WithId } from '@/firebase/firestore/use-collection';
import { User } from 'firebase/auth';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Image from 'next/image';

interface AppSidebarProps {
    onChannelSelect: (channel: M3uChannel) => void;
    onLocalVideoSelect: () => void;
    addedChannels: WithId<M3uChannel>[];
    favoriteChannelUrls: string[];
    user: User | null;
    isUserLoading: boolean;
    onToggleFavorite: (channelUrl: string) => void;
}

export function AppSidebar({
    onChannelSelect,
    onLocalVideoSelect,
    addedChannels,
    favoriteChannelUrls,
    user,
    isUserLoading,
    onToggleFavorite,
}: AppSidebarProps) {
  const { t } = useTranslation();
  const favoriteChannels = addedChannels.filter(c => favoriteChannelUrls.includes(c.url));

  const otherNavItems = [
    {
      label: t('addChannel'),
      icon: PlusCircle,
      sheetContent: <AddChannelSheetContent user={user} isUserLoading={isUserLoading} />,
    },
    {
      label: t('deviceStorage'),
      icon: Folder,
      action: onLocalVideoSelect,
    },
    {
      label: user ? t('profile') : t('login'),
      icon: UserIcon,
      sheetContent: <AuthSheetContent />,
    },
  ];

  return (
    <SheetContent side="left" className="flex flex-col">
      <SheetHeader>
        <SheetTitle>{t('menu')}</SheetTitle>
      </SheetHeader>
      <div className="py-4 flex-grow overflow-y-auto">
        <ul className="space-y-1">
          <Collapsible asChild>
            <li>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Tv2 size={20} />
                    <span>{t('channels')}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="py-1 pl-8 pr-2">
                 {addedChannels.length > 0 ? (
                    <ul className="space-y-1">
                      {addedChannels.map((channel) => (
                        <li key={channel.id}>
                           <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => onChannelSelect(channel)}>
                              <Image
                                src={channel.logo}
                                alt={channel.name}
                                width={24}
                                height={24}
                                className="rounded-sm"
                              />
                              <span className="font-normal flex-grow truncate text-left">{channel.name}</span>
                           </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-2">{t('noChannels')}</p>
                  )}
              </CollapsibleContent>
            </li>
          </Collapsible>

          <Collapsible asChild>
             <li>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Star size={20} />
                            <span>{t('favorites')}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="py-1 pl-8 pr-2">
                    {favoriteChannels.length > 0 ? (
                        <ul className="space-y-1">
                            {favoriteChannels.map((channel) => (
                            <li key={channel.id}>
                                <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => onChannelSelect(channel)}>
                                    <Image
                                        src={channel.logo}
                                        alt={channel.name}
                                        width={24}
                                        height={24}
                                        className="rounded-sm"
                                    />
                                    <span className="font-normal flex-grow truncate text-left">{channel.name}</span>
                                </Button>
                            </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground text-sm text-center py-2">{t('noFavorites')}</p>
                    )}
                </CollapsibleContent>
             </li>
          </Collapsible>
          
          {otherNavItems.map((item, index) => (
            <li key={index}>
              {item.sheetContent ? (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </Button>
                  </SheetTrigger>
                  {item.sheetContent}
                </Sheet>
              ) : (
                <Button variant="ghost" onClick={item.action} className="w-full justify-start gap-3">
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </SheetContent>
  );
}
