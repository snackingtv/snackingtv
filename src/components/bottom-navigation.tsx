'use client';

import { Home, PlusCircle, Tv2, Folder } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { AddChannelSheetContent, ChannelListSheetContent } from './video-card';
import { M3uChannel } from '@/lib/m3u-parser';
import { WithId } from '@/firebase/firestore/use-collection';
import { User } from 'firebase/auth';

interface BottomNavigationProps {
    showControls: boolean;
    onAddChannels: (channels: M3uChannel[]) => void;
    onChannelSelect: (channel: M3uChannel) => void;
    onLocalVideoSelect: () => void;
    addedChannels: WithId<M3uChannel>[];
    favoriteChannels: WithId<M3uChannel>[];
    user: User | null;
    isUserLoading: boolean;
}

export function BottomNavigation({
    showControls,
    onAddChannels,
    onChannelSelect,
    onLocalVideoSelect,
    addedChannels,
    favoriteChannels,
    user,
    isUserLoading,
}: BottomNavigationProps) {
  const { t } = useTranslation();

  const navItems = [
    {
      label: 'Home',
      icon: Home,
      action: () => { /* Maybe scroll to top? For now, nothing. */ },
      sheetContent: null,
    },
    {
      label: t('channels'),
      icon: Tv2,
      action: null,
      sheetContent: <ChannelListSheetContent channels={addedChannels} onChannelSelect={onChannelSelect} favoriteChannels={favoriteChannels} title={t('channels')} />,
    },
    {
      label: t('addChannel'),
      icon: PlusCircle,
      action: null,
      sheetContent: <AddChannelSheetContent onAddChannel={onAddChannels} user={user} isUserLoading={isUserLoading} />,
    },
    {
      label: t('deviceStorage'),
      icon: Folder,
      action: onLocalVideoSelect,
      sheetContent: null,
    },
  ];

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 h-20 bg-black/30 backdrop-blur-md transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex justify-around items-center h-full text-white">
        {navItems.map((item, index) => (
          <div key={index}>
            {item.sheetContent ? (
              <Sheet>
                <SheetTrigger asChild>
                  <button className="flex flex-col items-center justify-center gap-1">
                    <item.icon size={24} />
                    <span className="text-xs">{item.label}</span>
                  </button>
                </SheetTrigger>
                {item.sheetContent}
              </Sheet>
            ) : (
              <button onClick={item.action} className="flex flex-col items-center justify-center gap-1">
                <item.icon size={24} />
                <span className="text-xs">{item.label}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
