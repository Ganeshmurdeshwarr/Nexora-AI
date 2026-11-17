import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"

const firebaseConfig = {
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "nexora-6b015.firebaseapp.com",
  projectId: "nexora-6b015",
  storageBucket: "nexora-6b015.firebasestorage.app",
  messagingSenderId: "308762123973",
  appId: "1:308762123973:web:1710d038dbedb375bd1aac"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()