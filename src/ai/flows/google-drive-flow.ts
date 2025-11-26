'use server';
/**
 * @fileOverview A flow to list video files from a user's Google Drive.
 *
 * - listGoogleDriveFiles - Fetches video files from Google Drive using an access token.
 * - GoogleDriveInput - The input type for the listGoogleDriveFiles function.
 * - GoogleDriveOutput - The return type for the listGoogleDriveFiles function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GoogleAuth } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';

const GoogleDriveInputSchema = z.object({
  accessToken: z.string().describe('The OAuth2 access token for Google Drive API.'),
});
export type GoogleDriveInput = z.infer<typeof GoogleDriveInputSchema>;

// Define a schema for a single file
const FileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  thumbnailLink: z.string().optional(),
  webContentLink: z.string().optional(),
  createdTime: z.string(),
});

const GoogleDriveOutputSchema = z.array(FileSchema);
export type GoogleDriveOutput = z.infer<typeof GoogleDriveOutputSchema>;

export async function listGoogleDriveFiles(input: GoogleDriveInput): Promise<GoogleDriveOutput> {
  return listGoogleDriveFilesFlow(input);
}

const listGoogleDriveFilesFlow = ai.defineFlow(
  {
    name: 'listGoogleDriveFilesFlow',
    inputSchema: GoogleDriveInputSchema,
    outputSchema: GoogleDriveOutputSchema,
  },
  async ({ accessToken }) => {
    const auth = new GoogleAuth();
    const oauth2Client = new auth.OAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    try {
      const response = await drive.files.list({
        pageSize: 100,
        fields: 'files(id, name, mimeType, thumbnailLink, webContentLink, createdTime)',
        q: "mimeType contains 'video/'", // Query for video files
        orderBy: 'createdTime desc',
      });

      const files = response.data.files;
      if (!files || files.length === 0) {
        return [];
      }

      // Filter and map to ensure we match the Zod schema
      return files.map(file => ({
          id: file.id || '',
          name: file.name || 'Untitled',
          mimeType: file.mimeType || 'application/octet-stream',
          thumbnailLink: file.thumbnailLink,
          webContentLink: file.webContentLink,
          createdTime: file.createdTime || new Date().toISOString(),
      })).filter(f => f.id);

    } catch (error: any) {
      console.error('The API returned an error: ' + error);
      throw new Error('Failed to list Google Drive files: ' + error.message);
    }
  }
);
