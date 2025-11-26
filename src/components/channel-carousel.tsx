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

interface ChannelCarouselProps {
  title: string;
  channels: WithId<M3uChannel>[];
}

export function ChannelCarousel({ title, channels }: ChannelCarouselProps) {
  return (
    <div className="space-y-3 px-4 md:px-8">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <Carousel
        opts={{
          align: "start",
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {channels.map((channel) => (
            <CarouselItem key={channel.id} className="basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6 xl:basis-1/8">
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
  );
}
