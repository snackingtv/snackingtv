'use server';
/**
 * @fileOverview A proxy to fetch URL content to bypass CORS issues.
 *
 * - fetchUrlContent - Fetches content from a given URL.
 * - UrlProxyInput - The input type for the fetchUrlContent function.
 * - UrlProxyOutput - The return type for the fetchUrlContent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const UrlProxyInputSchema = z.object({
  url: z.string().url().describe('The URL to fetch content from.'),
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
  async ({ url }) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        // Throw an error that can be caught by the calling component
        throw new Error(`HTTP error! status: ${response.status} for url: ${url}. Body: ${errorText}`);
      }
      const textContent = await response.text();
      return textContent;
    } catch (error: any) {
      console.error(`Failed to fetch content from ${url}:`, error);
      // Re-throw the error to be handled by the caller, adding more context if it's a fetch error
      if (error.cause) {
         throw new Error(`Failed to fetch from ${url}: ${error.message} - Cause: ${error.cause}`);
      }
      throw error;
    }
  }
);
