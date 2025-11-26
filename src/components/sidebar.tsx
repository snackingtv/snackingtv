'use client';

import { PlusCircle, Tv2, Folder, User as UserIcon, Star, ChevronDown, Menu, Cloud } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { SheetContent, SheetHeader, SheetTitle, SheetTrigger, Sheet } from '@/components/ui/sheet';
import { AddChannelSheetContent, AuthSheetContent, GoogleDriveSheetContent } from './video-card';
import { M3uChannel } from '@/lib/m3u-parser';
import { WithId } from '@/firebase/firestore/use-collection';
import { User } from 'firebase/auth';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import Link from 'next/link';

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

  const groupedChannels = addedChannels.reduce((acc, channel) => {
    const group = channel.group || 'Uncategorized';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(channel);
    return acc;
  }, {} as Record<string, WithId<M3uChannel>[]>);

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
      label: t('googleDrive'),
      icon: Cloud,
      sheetContent: user ? <GoogleDriveSheetContent /> : <AuthSheetContent />,
    },
    {
      label: user ? t('profile') : t('login'),
      icon: UserIcon,
      sheetContent: <AuthSheetContent />,
    },
  ];

  const ChannelLink = ({channel, children}: {channel: M3uChannel, children: React.ReactNode}) => (
    <Link href={`/player?channel=${encodeURIComponent(JSON.stringify(channel))}`} className="w-full">
      {children}
    </Link>
  );

  return (
    <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full h-10 w-10 flex-shrink-0">
              <Menu size={20} className="drop-shadow-lg"/>
          </Button>
        </SheetTrigger>
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
                        <Tv2 size={18} />
                        <span>{t('channels')}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="py-1 pl-4 pr-2">
                    {addedChannels.length > 0 ? (
                        <Accordion type="multiple" className="w-full">
                        {Object.entries(groupedChannels).sort(([groupA], [groupB]) => groupA.localeCompare(groupB)).map(([group, channels]) => (
                            <AccordionItem value={group} key={group}>
                            <AccordionTrigger className="py-2 text-sm hover:no-underline">
                                {group} ({channels.length})
                            </AccordionTrigger>
                            <AccordionContent>
                                <ul className="space-y-1 pt-1">
                                {channels.map((channel) => (
                                    <li key={channel.id}>
                                      <ChannelLink channel={channel}>
                                        <Button variant="ghost" className="w-full justify-start gap-2 h-auto py-1.5">
                                            <Image
                                                src={channel.logo}
                                                alt={channel.name}
                                                width={20}
                                                height={20}
                                                className="rounded-sm flex-shrink-0"
                                            />
                                            <span className="font-normal flex-grow truncate text-left whitespace-normal text-xs">
                                                {channel.name}
                                            </span>
                                        </Button>
                                      </ChannelLink>
                                    </li>
                                ))}
                                </ul>
                            </AccordionContent>
                            </AccordionItem>
                        ))}
                        </Accordion>
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
                                <Star size={18} />
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
                                  <ChannelLink channel={channel}>
                                    <Button variant="ghost" className="w-full justify-start gap-2">
                                        <Image
                                            src={channel.logo}
                                            alt={channel.name}
                                            width={20}
                                            height={20}
                                            className="rounded-sm"
                                        />
                                        <span className="font-normal flex-grow truncate text-left">{channel.name}</span>
                                    </Button>
                                   </ChannelLink>
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
                        <item.icon size={18} />
                        <span>{item.label}</span>
                        </Button>
                    </SheetTrigger>
                    {item.sheetContent}
                    </Sheet>
                ) : (
                    <Button variant="ghost" onClick={item.action} className="w-full justify-start gap-3">
                    <item.icon size={18} />
                    <span>{item.label}</span>
                    </Button>
                )}
                </li>
            ))}
            </ul>
        </div>
        </SheetContent>
    </Sheet>
  );
}
