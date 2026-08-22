/**
 * config/firebase-admin.js
 * Initialize and configure Firebase Admin SDK.
 */
'use strict';

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let initialized = false;

// 1. Try parsing from FIREBASE_SERVICE_ACCOUNT env var (used in Production/Render)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
    console.log('🔥 Firebase Admin SDK initialized successfully via FIREBASE_SERVICE_ACCOUNT env var.');
    initialized = true;
  } catch (err) {
    console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT env var:', err.message);
  }
}

// 2. Try loading from a local config file (used in Local development if present)
if (!initialized) {
  const localKeyPath = path.join(__dirname, 'service-account.json');
  if (fs.existsSync(localKeyPath)) {
    try {
      const serviceAccount = require(localKeyPath);
      admin.initializeApp({
        credential: admin.cert(serviceAccount)
      });
      console.log('🔥 Firebase Admin SDK initialized successfully via local service-account.json.');
      initialized = true;
    } catch (err) {
      console.error('❌ Error loading local service-account.json:', err.message);
    }
  }
}

// 3. Fallback to application default credentials or mock in non-prod
if (!initialized) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: Firebase credentials missing. Set FIREBASE_SERVICE_ACCOUNT on Render.');
    process.exit(1);
  } else {
    // Local development fallback: try initializing default, or mock/warn
    try {
      admin.initializeApp();
      console.log('🔥 Firebase Admin SDK initialized via Application Default Credentials.');
      initialized = true;
    } catch (err) {
      console.warn('⚠️  Firebase Admin SDK initialized with empty/mock config (dev mode only).');
      // Dummy mock for dev testing if no firebase is configured locally
      module.exports = {
        auth: () => ({
          verifyIdToken: async (token) => {
            if (token === 'dev-token') {
              return { uid: 'dev_user_uid', email: 'dev_user@example.com', name: 'Dev User' };
            }
            throw new Error('Invalid token');
          }
        })
      };
      return;
    }
  }
}

module.exports = admin;
