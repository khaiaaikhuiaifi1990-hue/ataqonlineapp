import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBEVDNGqTegYbTu9KWcSl8qpeDDVEwJJQk",
  authDomain: "ataq-online.firebaseapp.com",
  projectId: "ataq-online",
  databaseURL: "https://ataq-online-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);

// Realtime Database for products
export const db = getDatabase(app);

// Firestore for configurations
export const fs = getFirestore(app);
