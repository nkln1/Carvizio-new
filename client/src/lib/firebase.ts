import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, sendEmailVerification } from "firebase/auth";
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

// Generează un token unic pentru dispozitiv
function generateDeviceToken(): string {
  // Generăm un ID unic folosind timestamp, random și informații despre browser
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000000000);
  const browserInfo = navigator.userAgent;
  
  // Creăm un hash simplu bazat pe aceste informații
  const tokenData = `${timestamp}-${random}-${browserInfo}`;
  
  // Convertim în base64 pentru un format mai compact
  return btoa(tokenData).substring(0, 40);
}

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

    // Verificăm întâi dacă avem un token salvat în cookie
    const savedToken = Cookie.get('fcm_token');
    if (savedToken) {
      console.log("Folosim token FCM din cookie:", savedToken);
      return savedToken;
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
    
    // Generăm un token unic de dispozitiv dacă FCM nu e disponibil
    if (!messaging) {
      const deviceToken = generateDeviceToken();
      Cookie.set('fcm_token', deviceToken, { expires: 30, secure: true, sameSite: 'Strict' });
      return deviceToken;
    }
    
    // Încercăm să obținem token FCM
    try {
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
  }

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