
import { cert, initializeApp } from "firebase-admin";

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccount) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is missing.");
}

export const app = initializeApp({
  credential: cert(JSON.parse(serviceAccount)),
});
