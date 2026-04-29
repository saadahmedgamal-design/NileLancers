import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAL0YVZsH3rG2nZ_A51Mm2HRncTxvEpPjQ",
  authDomain: "nilelancers2.firebaseapp.com",
  projectId: "nilelancers2",
  storageBucket: "nilelancers2.firebasestorage.app",
  messagingSenderId: "61625924053",
  appId: "1:61625924053:web:78fed86c8ad60f0b53a55c",
  measurementId: "G-0KMYYX994M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
