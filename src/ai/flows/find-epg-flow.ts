'use server';
/**
 * @fileOverview An AI flow to find an EPG (Electronic Program Guide) URL for a given TV channel.
 *
 * - findEpgUrl - A function that takes a channel name and returns a potential EPG XML URL.
 * - FindEpgUrlInput - The input type for the findEpgUrl function.
 * - FindEpgUrlOutput - The return type for the findEpgUrl function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FindEpgUrlInputSchema = z.object({
  channelName: z.string().describe('The name of the TV channel.'),
});
export type FindEpgUrlInput = z.infer<typeof FindEpgUrlInputSchema>;

const FindEpgUrlOutputSchema = z.object({
  url: z.string().url().optional().describe('The found XMLTV EPG URL for the channel.'),
});
export type FindEpgUrlOutput = z.infer<typeof FindEpgUrlOutputSchema>;


export async function findEpgUrl(input: FindEpgUrlInput): Promise<FindEpgUrlOutput> {
  return findEpgUrlFlow(input);
}


const findEpgPrompt = ai.definePrompt({
  name: 'findEpgPrompt',
  input: { schema: FindEpgUrlInputSchema },
  output: { schema: FindEpgUrlOutputSchema },
  prompt: `You are an expert at finding TV channel information. Your task is to find the XMLTV EPG URL for a given TV channel name.
  
The user will provide a channel name. Search the internet for a publicly available XMLTV file (often ending in .xml or .xml.gz) that contains the Electronic Program Guide (EPG) for this channel.

Return only the URL if you find a suitable one. If you cannot find a reliable URL, return an empty response.

Channel Name: {{{channelName}}}
`,
});


const findEpgUrlFlow = ai.defineFlow(
  {
    name: 'findEpgUrlFlow',
    inputSchema: FindEpgUrlInputSchema,
    outputSchema: FindEpgUrlOutputSchema,
  },
  async (input) => {
    const { output } = await findEpgPrompt(input);
    return output || { url: undefined };
  }
);
