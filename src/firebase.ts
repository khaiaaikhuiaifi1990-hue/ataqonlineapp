import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

// @ts-ignore
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
// @ts-ignore
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
// @ts-ignore
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
// @ts-ignore
const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  databaseURL
};

const app = initializeApp(firebaseConfig);

// Realtime Database for products
export const db = getDatabase(app);

// Firestore for configurations
export const fs = getFirestore(app);
