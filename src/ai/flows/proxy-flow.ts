'use server';
/**
 * @fileOverview A generic proxy flow to fetch URL content, optionally through another user-defined proxy.
 *
 * - fetchUrlContent - Fetches content from a given URL.
 * - UrlProxyInput - The input type for the fetchUrlContent function.
 * - UrlProxyOutput - The return type for the fetchUrlContent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { HttpsProxyAgent } from 'https-proxy-agent';

const UrlProxyInputSchema = z.object({
  url: z.string().url().describe('The URL to fetch content from.'),
  proxy: z.string().url().optional().describe('Optional proxy server to use.'),
});
export type UrlProxyInput = z.infer<typeof UrlProxyInputSchema>;

export type UrlProxyOutput = string;

export async function fetchUrlContent(input: UrlProxyInput): Promise<UrlProxyOutput> {
  return urlProxyFlow(input);
}

const urlProxyFlow = ai.defineFlow(
  {
    name: 'urlProxyFlow',
    inputSchema: UrlProxyInputSchema,
    outputSchema: z.string(),
  },
  async ({ url, proxy }) => {
    try {
      const options: RequestInit = {};
      if (proxy) {
        options.agent = new HttpsProxyAgent(proxy);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        // Throw an error that can be caught by the calling component
        throw new Error(`HTTP error! status: ${response.status} for url: ${url}. Body: ${errorText}`);
      }
      const textContent = await response.text();
      return textContent;
    } catch (error: any) {
      console.error(`Failed to fetch content from ${url} (via proxy: ${proxy || 'none'}):`, error);
      // Re-throw the error to be handled by the caller
      if (error.cause) {
         throw new Error(`Failed to fetch from ${url}: ${error.message} - Cause: ${error.cause}`);
      }
      throw error;
    }
  }
);
