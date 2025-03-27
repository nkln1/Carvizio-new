// Firebase declarations

/**
 * Adăugare la declarațiile de mediu Vite
 */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_VAPID_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * Tipuri pentru configurația Firebase
 */
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * Tipuri pentru notificările Firebase
 */
interface FirebaseNotificationPayload {
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
    click_action?: string;
  };
  data?: {
    [key: string]: string;
    url?: string;
    tag?: string;
  };
  from: string;
  collapse_key?: string;
}

/**
 * Extinde interfața globală NotificationOptions pentru a include proprietăți utilizate de către browsere moderne
 * dar care nu sunt încă incluse în tipul standard TypeScript
 */
interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  renotify?: boolean;
  silent?: boolean;
  sound?: string;
  dir?: 'auto' | 'ltr' | 'rtl';
  vibrate?: number[]; // Vibrație pentru dispozitive mobile
}