'use server';
/**
 * @fileOverview A flow to search the web for M3U playlists.
 *
 * - searchM3u - Searches for M3U playlists based on a language.
 * - SearchM3uInput - The input type for the searchM3u function.
 * - SearchM3uOutput - The return type for the searchM3u function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SearchM3uInputSchema = z.object({
  language: z.string().describe('The language to filter the search results.'),
});
export type SearchM3uInput = z.infer<typeof SearchM3uInputSchema>;

const PlaylistResultSchema = z.object({
  name: z.string().describe('A descriptive name for the playlist found.'),
  url: z.string().url().describe('The raw URL of the M3U playlist file.'),
});

const SearchM3uOutputSchema = z.array(PlaylistResultSchema);
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
  async ({ language }) => {
    const prompt = `You are an expert web searcher specializing in finding public IPTV streams on GitHub.
    Search GitHub for M3U playlist files for channels in the language: "${language}".
    Only return publicly available and legal streams from GitHub repositories.
    For each found playlist, provide a descriptive name and the direct raw URL to the .m3u or .m3u8 file.
    Provide at least 5 results if possible.
    Ensure the response is a valid JSON array matching the output schema.`;

    try {
      const { output } = await ai.generate({
        prompt,
        model: 'googleai/gemma-2b-it',
        output: {
          format: 'json',
          schema: SearchM3uOutputSchema,
        },
        config: {
          safetySettings: [
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE',
            },
          ],
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
