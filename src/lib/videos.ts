export type Video = {
  id: number | string;
  url: string;
  title: string;
  author: string;
  avatarId: string;
};

export const videos: Video[] = [
  {
    id: 1,
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    title: 'Big Buck Bunny',
    author: '@blender',
    avatarId: 'avatar1'
  },
  {
    id: 2,
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    title: 'Elephants Dream',
    author: '@blender',
    avatarId: 'avatar2'
  },
  {
    id: 3,
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'For Bigger Blazes',
    author: '@google',
    avatarId: 'avatar3'
  },
  {
    id: 4,
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    title: 'For Bigger Escapes',
    author: '@google',
    avatarId: 'avatar4'
  },
  {
    id: 5,
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    title: 'For Bigger Fun',
    author: '@google',
    avatarId: 'avatar5'
  }
];
