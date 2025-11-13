'use server';
/**
 * @fileOverview A flow to search for YouTube videos.
 *
 * - searchYouTube - Searches for videos on YouTube.
 * - SearchYouTubeInput - The input type for the searchYouTube function.
 * - SearchYouTubeOutput - The return type for the searchYouTube function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SearchYouTubeInputSchema = z.object({
  query: z.string().describe('The search query for YouTube videos.'),
});
export type SearchYouTubeInput = z.infer<typeof SearchYouTubeInputSchema>;

const YouTubeVideoResultSchema = z.object({
  title: z.string().describe('The title of the YouTube video.'),
  url: z.string().url().describe('The URL of the YouTube video.'),
  channel: z.string().describe('The name of the YouTube channel.'),
  thumbnail: z.string().url().describe('The URL for the video thumbnail image.'),
});

const SearchYouTubeOutputSchema = z.array(YouTubeVideoResultSchema);
export type SearchYouTubeOutput = z.infer<typeof SearchYouTubeOutputSchema>;

export async function searchYouTube(input: SearchYouTubeInput): Promise<SearchYouTubeOutput> {
  return searchYouTubeFlow(input);
}

const searchYouTubeFlow = ai.defineFlow(
  {
    name: 'searchYouTubeFlow',
    inputSchema: SearchYouTubeInputSchema,
    outputSchema: SearchYouTubeOutputSchema,
  },
  async ({ query }) => {
    const prompt = `You are an expert YouTube searcher. 
    Find videos on YouTube based on the query: "${query}".
    For each video, provide the title, URL, channel name, and a thumbnail URL.
    Provide at least 5 results if possible.
    Ensure the response is a valid JSON array matching the output schema.`;

    try {
      const { output } = await ai.generate({
        prompt,
        model: 'googleai/gemma-2b-it',
        output: {
          format: 'json',
          schema: SearchYouTubeOutputSchema,
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
      console.error('An error occurred during the YouTube search flow:', error);
      return [];
    }
  }
);
