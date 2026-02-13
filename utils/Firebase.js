import {getAuth, GoogleAuthProvider} from "firebase/auth"
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY || "AIzaSyDummyKeyIfNotSet",
  authDomain: "loginlms-a7ea1.firebaseapp.com",
  projectId: "loginlms-a7ea1",
  storageBucket: "loginlms-a7ea1.firebasestorage.app",
  messagingSenderId: "665916718747",
  appId: "1:665916718747:web:16dbe0bfe5aeeface0903e"
};

// Initialize Firebase
let app, auth, provider;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  provider = new GoogleAuthProvider();
  // Add scopes if needed
  provider.addScope('email');
  provider.addScope('profile');
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Create dummy objects to prevent crashes
  auth = null;
  provider = null;
}

export {auth, provider}