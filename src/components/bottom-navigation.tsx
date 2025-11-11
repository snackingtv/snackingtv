'use client';

import { PlusCircle, Tv2, Folder, User as UserIcon, Star } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { AddChannelSheetContent, ChannelListSheetContent, FavoriteChannelListSheetContent, AuthSheetContent } from './video-card';
import { M3uChannel } from '@/lib/m3u-parser';
import { WithId } from '@/firebase/firestore/use-collection';
import { User } from 'firebase/auth';

interface BottomNavigationProps {
    onChannelSelect: (channel: M3uChannel) => void;
    onLocalVideoSelect: () => void;
    addedChannels: WithId<M3uChannel>[];
    favoriteChannelUrls: string[];
    user: User | null;
    isUserLoading: boolean;
    onToggleFavorite: (channelUrl: string) => void;
}

export function BottomNavigation({
    onChannelSelect,
    onLocalVideoSelect,
    addedChannels,
    favoriteChannelUrls,
    user,
    isUserLoading,
    onToggleFavorite,
}: BottomNavigationProps) {
  const { t } = useTranslation();
  const favoriteChannels = addedChannels.filter(c => favoriteChannelUrls.includes(c.url));

  const navItems = [
    {
      label: t('channels'),
      icon: Tv2,
      action: null,
      sheetContent: <ChannelListSheetContent channels={addedChannels} onChannelSelect={onChannelSelect} title={t('channels')} />,
    },
    {
      label: t('favorites'),
      icon: Star,
      action: null,
      sheetContent: <FavoriteChannelListSheetContent channels={favoriteChannels} onChannelSelect={onChannelSelect} title={t('favorites')} onToggleFavorite={onToggleFavorite} />,
    },
    {
      label: t('addChannel'),
      icon: PlusCircle,
      action: null,
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
      action: null,
      sheetContent: <AuthSheetContent />,
    },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-16 bg-black/30 backdrop-blur-md z-20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around items-center h-full text-white">
        {navItems.map((item, index) => (
          <div key={index}>
            {item.sheetContent ? (
              <Sheet>
                <SheetTrigger asChild>
                  <button className="flex flex-col items-center justify-center gap-1">
                    <item.icon size={20} />
                    <span className="text-[8px] font-medium">{item.label}</span>
                  </button>
                </SheetTrigger>
                {item.sheetContent}
              </Sheet>
            ) : (
              <button onClick={item.action} className="flex flex-col items-center justify-center gap-1">
                <item.icon size={20} />
                <span className="text-[8px] font-medium">{item.label}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
