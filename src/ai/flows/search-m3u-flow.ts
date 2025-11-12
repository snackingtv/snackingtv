'use server';
/**
 * @fileOverview A flow to search the web for M3U8 playlists.
 *
 * - searchM3u - Searches for M3U8 playlists based on a query and language.
 * - SearchM3uInput - The input type for the searchM3u function.
 * - SearchM3uOutput - The return type for the searchM3u function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SearchM3uInputSchema = z.object({
  query: z.string().describe('The search query for M3U playlists.'),
  language: z.string().describe('The language to filter the search results.'),
});
export type SearchM3uInput = z.infer<typeof SearchM3uInputSchema>;

const ChannelResultSchema = z.object({
  name: z.string().describe('The name of the channel.'),
  url: z.string().url().describe('The M3U8 stream URL.'),
  logo: z.string().url().describe('A URL for the channel logo.'),
  group: z.string().describe('The group or category of the channel.'),
});

const SearchM3uOutputSchema = z.array(ChannelResultSchema);
export type SearchM3uOutput = z.infer<typeof SearchM3uOutputSchema>;

export async function searchM3u(input: SearchM3uInput): Promise<SearchM3uOutput> {
  return searchM3uFlow(input);
}

const searchM3uFlow = ai.defineFlow(
  {
    name: 'searchM3uFlow',
    inputSchema: SearchM3uInputSchema,
    outputSchema: SearchM3uOutputSchema,
  },
  async ({ query, language }) => {
    const prompt = `You are an expert web searcher specializing in finding public IPTV streams on GitHub.
    Search GitHub for M3U/M3U8 playlists related to the query: "${query}".
    The results should be filtered for the language: "${language}".
    Only return publicly available and legal streams from GitHub repositories.
    For each found channel, provide its name, a direct stream URL (must end in .m3u8), a logo URL, and a relevant group/category.
    Provide at least 5 results if possible. If you cannot find a real logo, use a placeholder image from picsum.photos.
    Ensure the response is a valid JSON array matching the output schema.`;

    try {
      const { output } = await ai.generate({
        prompt,
        model: 'googleai/gemini-2.5-pro',
        output: {
          format: 'json',
          schema: SearchM3uOutputSchema,
        },
      });
      return output || [];
    } catch (error) {
      console.error('An error occurred during the M3U search flow:', error);
      // Return an empty array to prevent the app from crashing on model overload.
      return [];
    }
  }
);
