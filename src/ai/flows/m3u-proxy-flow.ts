'use server';
/**
 * @fileOverview A proxy to fetch M3U playlist content to bypass CORS issues.
 *
 * - fetchM3u - Fetches content from a given M3U URL.
 * - M3uProxyInput - The input type for the fetchM3u function.
 * - M3uProxyOutput - The return type for the fetchM3u function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const M3uProxyInputSchema = z.object({
  url: z.string().url().describe('The URL of the M3U playlist.'),
});
export type M3uProxyInput = z.infer<typeof M3uProxyInputSchema>;

export type M3uProxyOutput = string;

export async function fetchM3u(input: M3uProxyInput): Promise<M3uProxyOutput> {
  return m3uProxyFlow(input);
}

const m3uProxyFlow = ai.defineFlow(
  {
    name: 'm3uProxyFlow',
    inputSchema: M3uProxyInputSchema,
    outputSchema: z.string(),
  },
  async ({ url }) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const textContent = await response.text();
      return textContent;
    } catch (error) {
      console.error('Failed to fetch M3U file:', error);
      throw new Error('Could not retrieve the M3U playlist.');
    }
  }
);
