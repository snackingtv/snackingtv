'use client';

import { PlusCircle, Tv2, Folder, User as UserIcon, Star } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AddChannelSheetContent, ChannelListSheetContent, FavoriteChannelListSheetContent, AuthSheetContent } from './video-card';
import { M3uChannel } from '@/lib/m3u-parser';
import { WithId } from '@/firebase/firestore/use-collection';
import { User } from 'firebase/auth';
import { Button } from './ui/button';

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

  const navItems = [
    {
      label: t('channels'),
      icon: Tv2,
      sheetContent: <ChannelListSheetContent channels={addedChannels} onChannelSelect={onChannelSelect} title={t('channels')} />,
    },
    {
      label: t('favorites'),
      icon: Star,
      sheetContent: <FavoriteChannelListSheetContent channels={favoriteChannels} onChannelSelect={onChannelSelect} title={t('favorites')} onToggleFavorite={onToggleFavorite} />,
    },
    {
      label: t('addChannel'),
      icon: PlusCircle,
      sheetContent: <AddChannelSheetContent user={user} isUserLoading={isUserLoading} />,
    },
    {
      label: t('deviceStorage'),
      icon: Folder,
      action: onLocalVideoSelect,
      sheetContent: null,
    },
    {
      label: user ? t('profile') : t('login'),
      icon: UserIcon,
      sheetContent: <AuthSheetContent />,
    },
  ];

  return (
    <SheetContent side="left">
      <SheetHeader>
        <SheetTitle>{t('menu')}</SheetTitle>
      </SheetHeader>
      <div className="py-4">
        <ul className="space-y-2">
          {navItems.map((item, index) => (
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
