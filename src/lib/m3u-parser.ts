export interface M3uChannel {
  name: string;
  logo: string;
  url: string;
  group: string;
  subtitlesUrl?: string;
  epgUrl?: string;
}

export function parseM3u(m3uContent: string): M3uChannel[] {
  const lines = m3uContent.split('\n');
  const channels: M3uChannel[] = [];

  if (!lines[0].startsWith('#EXTM3U')) {
    // M3U8 files can also just contain a list of URLs.
    // Let's try to parse it as a simple list of streams.
    const urlLines = lines.filter(line => line.trim().length > 0 && !line.startsWith('#'));
    if (urlLines.length > 0) {
        return urlLines.map((url, index) => ({
            name: `Stream ${index + 1}`,
            logo: `https://picsum.photos/seed/iptv${Math.random()}/64/64`,
            url: url.trim(),
            group: 'Imported',
        }));
    }
    throw new Error('Invalid M3U/M3U8 file: Missing #EXTM3U header and no stream URLs found.');
  }

  let currentChannel: Partial<M3uChannel> = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Reset for new channel info
      currentChannel = {};

      const nameMatch = line.match(/,(.*)$/);
      if (nameMatch) {
        currentChannel.name = nameMatch[1];
      }

      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      if (logoMatch) {
        currentChannel.logo = logoMatch[1];
      }

      const groupMatch = line.match(/group-title="([^"]*)"/);
      if (groupMatch) {
        currentChannel.group = groupMatch[1];
      }

      const epgMatch = line.match(/tvg-id="([^"]*)"/);
      if (epgMatch) {
        // This is a common convention, but not standard. 
        // We'll treat the tvg-id as a potential source for an EPG url.
        // A more robust solution would need a mapping.
        currentChannel.epgUrl = epgMatch[1];
      }

    } else if (line && !line.startsWith('#')) {
      currentChannel.url = line;
      if (currentChannel.name && currentChannel.url) {
        channels.push({
          name: currentChannel.name,
          logo: currentChannel.logo || `https://picsum.photos/seed/iptv${Math.random()}/64/64`,
          url: currentChannel.url,
          group: currentChannel.group || 'Default',
          epgUrl: currentChannel.epgUrl
        });
      }
      currentChannel = {}; // Reset after pushing
    }
  }

  return channels;
}
