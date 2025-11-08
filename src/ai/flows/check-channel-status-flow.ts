'use server';
/**
 * @fileOverview A proxy to check the status of a channel URL to bypass CORS issues.
 *
 * - checkChannelStatus - Checks the status of a given channel URL.
 * - ChannelStatusInput - The input type for the checkChannelStatus function.
 * - ChannelStatusOutput - The return type for the checkChannelStatus function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChannelStatusInputSchema = z.object({
  url: z.string().url().describe('The URL of the channel to check.'),
});
export type ChannelStatusInput = z.infer<typeof ChannelStatusInputSchema>;

const ChannelStatusOutputSchema = z.object({
  online: z.boolean(),
  status: z.number().optional(),
});
export type ChannelStatusOutput = z.infer<typeof ChannelStatusOutputSchema>;

export async function checkChannelStatus(
  input: ChannelStatusInput
): Promise<ChannelStatusOutput> {
  return checkChannelStatusFlow(input);
}

const checkChannelStatusFlow = ai.defineFlow(
  {
    name: 'checkChannelStatusFlow',
    inputSchema: ChannelStatusInputSchema,
    outputSchema: ChannelStatusOutputSchema,
  },
  async ({ url }) => {
    try {
      // We use a HEAD request to be efficient and not download the whole stream.
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });

      // Consider any 2xx or 3xx status as "online"
      if (response.ok || (response.status >= 300 && response.status < 400)) {
        return { online: true, status: response.status };
      } else {
        return { online: false, status: response.status };
      }
    } catch (error) {
      // Network errors, etc.
      console.error(`Failed to check channel status for ${url}:`, error);
      return { online: false };
    }
  }
);
