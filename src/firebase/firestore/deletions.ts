'use client';

import {
  writeBatch,
  doc,
  Firestore,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Deletes multiple channel documents from Firestore in a single batch.
 * Does not block execution.
 * @param firestore - The Firestore instance.
 * @param channelIds - An array of document IDs to delete from the 'user_channels' collection.
 */
export function deleteChannels(firestore: Firestore, channelIds: string[]): Promise<void> {
  const batch = writeBatch(firestore);

  channelIds.forEach(id => {
    const docRef = doc(firestore, 'user_channels', id);
    batch.delete(docRef);
  });

  return batch.commit().catch(error => {
    // In a batch, it's hard to know which specific doc failed.
    // We'll emit a more generic error for the collection.
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: 'user_channels',
        operation: 'delete',
        requestResourceData: { channelIds },
      })
    );
    // Rethrow to allow the caller to handle the promise rejection.
    throw error;
  });
}

    