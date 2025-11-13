export type Video = {
  id: number | string;
  url: string | File;
  title: string;
  author: string;
  avatarId: string;
  subtitlesUrl?: string;
};

export const videos: Video[] = [];
