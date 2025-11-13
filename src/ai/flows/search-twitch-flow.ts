'use server';
/**
 * @fileOverview A flow to search for live Twitch streams.
 *
 * - searchTwitch - Searches for live streams on Twitch.
 * - SearchTwitchInput - The input type for the searchTwitch function.
 * - SearchTwitchOutput - The return type for the searchTwitch function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SearchTwitchInputSchema = z.object({
  query: z.string().describe('The search query for Twitch streams.'),
});
export type SearchTwitchInput = z.infer<typeof SearchTwitchInputSchema>;

const TwitchStreamResultSchema = z.object({
  channel: z.string().describe('The name of the Twitch channel.'),
  title: z.string().describe('The title of the live stream.'),
  url: z.string().url().describe('The URL of the Twitch stream.'),
  thumbnail: z.string().url().describe('The URL for the stream thumbnail image.'),
});

const SearchTwitchOutputSchema = z.array(TwitchStreamResultSchema);
export type SearchTwitchOutput = z.infer<typeof SearchTwitchOutputSchema>;

export async function searchTwitch(input: SearchTwitchInput): Promise<SearchTwitchOutput> {
  return searchTwitchFlow(input);
}

const searchTwitchFlow = ai.defineFlow(
  {
    name: 'searchTwitchFlow',
    inputSchema: SearchTwitchInputSchema,
    outputSchema: SearchTwitchOutputSchema,
  },
  async ({ query }) => {
    const prompt = `You are an expert Twitch.tv searcher. 
    Find live streams on Twitch based on the query: "${query}".
    For each stream, provide the channel name, stream title, URL, and a thumbnail URL.
    Provide at least 5 results if possible.
    Ensure the response is a valid JSON array matching the output schema.`;

    try {
      const { output } = await ai.generate({
        prompt,
        model: 'googleai/gemma-2b-it',
        output: {
          format: 'json',
          schema: SearchTwitchOutputSchema,
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
      console.error('An error occurred during the Twitch search flow:', error);
      return [];
    }
  }
);
