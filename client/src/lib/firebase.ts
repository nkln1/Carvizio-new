import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, sendEmailVerification } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to LOCAL (survives browser restart)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase persistence set to LOCAL");
  })
  .catch((error) => {
    console.error("Firebase persistence error:", error);
  });

// Log the current auth state
auth.onAuthStateChanged((user) => {
  console.log("Firebase auth state:", user ? "Logged in" : "Logged out");
  if (user) {
    console.log("Email verified:", user.emailVerified);
  }
});

// Export initialized flag
export const isFirebaseInitialized = new Promise((resolve) => {
  auth.onAuthStateChanged(() => {
    resolve(true);
  });
});

// Function to send verification email
export const sendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    await sendEmailVerification(user);
  }
};