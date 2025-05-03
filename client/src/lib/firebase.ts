import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  sendEmailVerification,
  browserSessionPersistence, // Pentru sesiuni mai scurte la cerere
  signOut,
  signInWithEmailAndPassword
} from "firebase/auth";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Încărcăm Messaging dacă este suportat (poate fi null în SSR sau dacă browserul nu suportă)
export const messagingSupported = isSupported();
export let messaging: any = null;

// Inițializăm Messaging doar dacă browserul îl suportă
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  messagingSupported.then(isSupported => {
    if (isSupported) {
      console.log("Firebase Cloud Messaging este suportat în acest browser");
      messaging = getMessaging(app);
    } else {
      console.warn("Firebase Cloud Messaging nu este suportat în acest browser");
    }
  }).catch(err => {
    console.error("Eroare la verificarea suportului pentru Firebase Cloud Messaging:", err);
  });
}

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

// Funcția pentru obținerea și înregistrarea tokenului FCM
export const requestFCMPermissionAndToken = async (): Promise<string | null> => {
  if (!messaging) {
    console.warn("Firebase Cloud Messaging nu este disponibil");
    return null;
  }

  try {
    // Solicităm permisiunea pentru notificări (să utilizăm API-ul Notification)
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn("Permisiunile pentru notificări nu au fost acordate");
        return null;
      }
    }

    // Obținem tokenul FCM, specificând Service Worker-ul nostru
    // Încercăm să obținem Service Worker-ul specific pentru Firebase Messaging sau folosim oricare activ
    let swRegistration;
    try {
      swRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      if (!swRegistration) {
        // Ca fallback, obținem oricare service worker activ
        swRegistration = await navigator.serviceWorker.ready;
      }
    } catch (err) {
      console.warn("Eroare la obținerea Service Worker-ului:", err);
      // Continuăm fără a specifica Service Worker-ul
    }
    
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration
    });

    if (token) {
      console.log("Token FCM obținut:", token);
      return token;
    } else {
      console.warn("Nu s-a putut obține tokenul FCM");
      return null;
    }
  } catch (error) {
    console.error("Eroare la obținerea tokenului FCM:", error);
    return null;
  }
};

// Configurarea handler-ului pentru mesaje în prim-plan
export const setupFCMForegroundListener = (callback: (payload: any) => void) => {
  if (!messaging) {
    console.warn("Firebase Cloud Messaging nu este disponibil pentru ascultarea mesajelor");
    return () => {}; // Returnăm o funcție de cleanup goală
  }

  return onMessage(messaging, (payload) => {
    console.log("Mesaj primit în prim-plan:", payload);
    callback(payload);
  });
};

/**
 * Sistem de protecție pentru autentificarea cu email și parolă
 * Implementează limitarea încercărilor de autentificare și management al sesiunii
 */
// Tracker pentru tentativele de autentificare eșuate
const authFailures = {
  count: 0,
  lastAttempt: 0,
  lockedUntil: 0
};

// Duratele de blocare cresc cu fiecare încercare eșuată consecutivă
const LOCKOUT_DURATIONS = [
  0,          // Prima greșeală - fără blocare
  0,          // A doua greșeală - fără blocare
  60 * 1000,  // 1 minut după 3 greșeli
  300 * 1000, // 5 minute după 4 greșeli
  900 * 1000, // 15 minute după 5 greșeli
  3600 * 1000 // 1 oră după 6+ greșeli
];

/**
 * Funcție securizată pentru autentificarea cu email și parolă
 * Include protecție împotriva atacurilor de forță brută
 */
export const secureSignInWithEmailAndPassword = async (email: string, password: string): Promise<any> => {
  const now = Date.now();
  
  // Verifică dacă contul este blocat temporar
  if (authFailures.lockedUntil > now) {
    const remainingTime = Math.ceil((authFailures.lockedUntil - now) / 1000 / 60);
    throw new Error(`Cont blocat temporar. Încercați din nou în ${remainingTime} minute.`);
  }

  // Resetăm contorul dacă a trecut suficient timp de la ultima încercare (30 de minute)
  if (now - authFailures.lastAttempt > 30 * 60 * 1000) {
    authFailures.count = 0;
  }

  try {
    // Încercăm autentificarea
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    // Resetăm contorul de erori la autentificare reușită
    authFailures.count = 0;
    
    return result;
  } catch (error: any) {
    // Incrementăm contorul de erori
    authFailures.count++;
    authFailures.lastAttempt = now;
    
    // Determinăm durata de blocare bazată pe numărul de încercări eșuate
    const durationIndex = Math.min(authFailures.count - 1, LOCKOUT_DURATIONS.length - 1);
    const lockDuration = LOCKOUT_DURATIONS[durationIndex];
    
    if (lockDuration > 0) {
      authFailures.lockedUntil = now + lockDuration;
      
      // Pentru a preveni atacurile de forță brută, adăugăm un delay aleatoriu
      const delayMs = 1000 + Math.floor(Math.random() * 2000); // 1-3 secunde
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      const lockMinutes = lockDuration / 60 / 1000;
      throw new Error(`Prea multe încercări eșuate. Contul este blocat pentru ${lockMinutes} minute.`);
    }
    
    // Re-aruncăm eroarea originală Firebase pentru alte tipuri de erori
    throw error;
  }
};

/**
 * Funcție pentru schimbarea modului de persistență (sesiune vs locală)
 * Poate fi folosită pentru a comuta între sesiuni permanente și temporare
 */
export const switchPersistenceMode = async (useSession: boolean = false) => {
  try {
    // Deconectăm utilizatorul curent
    await signOut(auth);
    
    // Setăm modul de persistență selectat
    if (useSession) {
      await setPersistence(auth, browserSessionPersistence);
      console.log("Firebase persistence set to SESSION");
    } else {
      await setPersistence(auth, browserLocalPersistence);
      console.log("Firebase persistence set to LOCAL");
    }
    
    return true;
  } catch (error) {
    console.error("Error switching persistence mode:", error);
    return false;
  }
};