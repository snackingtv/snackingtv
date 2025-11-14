'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length) {
    return getSdks(getApp());
  }

  let firebaseApp;
  // When not in a production environment, we can't rely on App Hosting's automatic configuration.
  // Therefore, we initialize directly with the provided config object.
  if (process.env.NODE_ENV !== 'production') {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    // In production, we attempt the automatic initialization first, which is required for App Hosting.
    try {
      firebaseApp = initializeApp();
    } catch (e) {
      console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      firebaseApp = initializeApp(firebaseConfig);
    }
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './firestore/deletions';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

    