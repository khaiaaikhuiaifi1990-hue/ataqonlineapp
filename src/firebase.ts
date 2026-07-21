import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

// Fallback configuration values to ensure the app never crashes on missing environment variables
// @ts-ignore
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForFallback123456789";
// @ts-ignore
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ataq-online.firebaseapp.com";
// @ts-ignore
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "ataq-online";
// @ts-ignore
const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://ataq-online-default-rtdb.firebaseio.com";

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  databaseURL
};

// Initialize Firebase App safely as a singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Realtime Database for products
export const db = (() => {
  try {
    return getDatabase(app, databaseURL);
  } catch (e) {
    console.warn("Realtime Database initialization warning:", e);
    return getDatabase(app);
  }
})();

// Firestore for configurations
export const fs = (() => {
  try {
    return getFirestore(app);
  } catch (e) {
    console.warn("Firestore initialization warning:", e);
    return getFirestore(app);
  }
})();

