import { VideoFeed } from '@/components/video-feed';

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      <h1 className="sr-only">SnackingTV - A vertical video feed</h1>
      <VideoFeed />
    </main>
  );
}
