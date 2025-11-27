'use client';

import { M3uChannel } from "@/lib/m3u-parser";
import { WithId } from "@/firebase/firestore/use-collection";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { useTranslation } from "@/lib/i18n";
import { AddChannelSheetContent } from "./video-card";
import { Plus } from "lucide-react";
import { useUser } from "@/firebase";

interface ChannelCarouselProps {
  title: React.ReactNode;
  channels: WithId<M3uChannel>[];
  onManageClick?: () => void;
  showAddChannel?: boolean;
}

export function ChannelCarousel({ title, channels, onManageClick, showAddChannel }: ChannelCarouselProps) {
  const { t } = useTranslation();
  const { user, isUserLoading } = useUser();

  const carouselItemClasses = "basis-1/5 sm:basis-1/6 md:basis-1/8 lg:basis-1/10 xl:basis-1/12";

  return (
    <div className="space-y-3 px-4 md:px-8">
       <div className="flex items-center justify-between">
        <div className="text-lg font-bold text-white flex items-center gap-2">{title}</div>
        {onManageClick && (
          <Button variant="outline" size="sm" onClick={onManageClick}>
            {t('manage')}
          </Button>
        )}
      </div>
      <div className="flex items-start gap-4">
        {showAddChannel && (
            <div className={`${carouselItemClasses} flex-shrink-0`}>
               <AddChannelSheetContent user={user} isUserLoading={isUserLoading} trigger={
                  <div className="group">
                    <Card className="overflow-hidden border border-zinc-700 bg-zinc-900 aspect-[16/9] transition-transform duration-200 ease-in-out group-hover:scale-105 flex items-center justify-center">
                      <Plus className="h-8 w-8 text-zinc-400 group-hover:text-white" />
                    </Card>
                    <p className="mt-2 text-xs text-zinc-300 truncate group-hover:text-white text-center">
                      {t('addChannel')}
                    </p>
                  </div>
                } />
            </div>
          )}
        <Carousel
          opts={{
            align: "start",
            dragFree: true,
          }}
          className="w-full"
        >
          <CarouselContent>
            {channels.map((channel) => (
              <CarouselItem key={channel.id} className={carouselItemClasses}>
                <Link href={`/player?channel=${encodeURIComponent(JSON.stringify(channel))}`}>
                  <div className="group">
                    <Card className="overflow-hidden border border-zinc-700 bg-zinc-900 aspect-[16/9] transition-transform duration-200 ease-in-out group-hover:scale-105">
                      <CardContent className="p-0 flex items-center justify-center h-full">
                        <Image
                          src={channel.logo}
                          alt={channel.name}
                          width={100}
                          height={100}
                          className="object-contain w-full h-full p-2"
                          onError={(e) => e.currentTarget.src = `https://picsum.photos/seed/${channel.name}/100/100`}
                        />
                      </CardContent>
                    </Card>
                    <p className="mt-2 text-xs text-zinc-300 truncate group-hover:text-white">
                      {channel.name}
                    </p>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    </div>
  );
}
