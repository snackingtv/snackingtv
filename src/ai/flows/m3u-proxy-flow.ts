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
import { fetchUrlContent } from './proxy-flow';

const M3uProxyInputSchema = z.object({
  url: z.string().url().describe('The URL of the M3U playlist.'),
  proxy: z.string().url().optional().describe('Optional proxy server to use.'),
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
  async ({ url, proxy }) => {
    try {
      // Use the generic proxy flow to fetch the content
      const content = await fetchUrlContent({ url, proxy });
      return content;
    } catch (error) {
      console.error(`Failed to fetch M3U file via proxy flow for url: ${url}:`, error);
      // Return an empty string on any error to prevent app crash
      return '';
    }
  }
);
