/**
 * firebase.js
 * Initialize Firebase Client SDK for Web.
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:             import.meta.env.VITE_FIREBASE_API_KEY || 'mock-api-key',
  authDomain:         import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mock-auth-domain',
  projectId:          import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mock-project-id',
  storageBucket:      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mock-storage-bucket',
  messagingSenderId:  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'mock-sender-id',
  appId:              import.meta.env.VITE_FIREBASE_APP_ID || 'mock-app-id'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export default app;
