/**
 * firebase.js
 * Initialize Firebase Client SDK for Web.
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:             import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBToj68e920n3JWWGTwHjiKRInFRjsUDuo',
  authDomain:         import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'studybuddy-ai-6e9a0.firebaseapp.com',
  projectId:          import.meta.env.VITE_FIREBASE_PROJECT_ID || 'studybuddy-ai-6e9a0',
  storageBucket:      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'studybuddy-ai-6e9a0.firebasestorage.app',
  messagingSenderId:  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '551872780098',
  appId:              import.meta.env.VITE_FIREBASE_APP_ID || '1:551872780098:web:be41aa95b7ce19422a9adb'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export default app;
