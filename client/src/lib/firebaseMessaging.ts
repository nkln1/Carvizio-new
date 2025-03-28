import { messaging, messagingSupported, isFirebaseInitialized } from './firebase';
import Cookie from 'js-cookie';

/**
 * Clasa pentru gestionarea mesajelor Firebase și a notificărilor push
 */
class FirebaseMessaging {
  private static instance: FirebaseMessaging | null = null;
  private fcmToken: string | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private userId: number | null = null;
  private userRole: 'client' | 'service' | null = null;

  /**
   * Constructor privat pentru Singleton
   */
  private constructor() {
    // Inițializat în metoda initialize()
  }

  /**
   * Returnează instanța singleton
   */
  public static getInstance(): FirebaseMessaging {
    if (!FirebaseMessaging.instance) {
      FirebaseMessaging.instance = new FirebaseMessaging();
    }
    return FirebaseMessaging.instance;
  }

  /**
   * Inițializează Firebase Messaging cu ID-ul utilizatorului și rolul său
   */
  public async initialize(userId: number, userRole: 'client' | 'service'): Promise<boolean> {
    this.userId = userId;
    this.userRole = userRole;

    // Verificăm dacă browserul suportă notificările și service workers
    if (!messagingSupported || !('serviceWorker' in navigator)) {
      console.warn('Firebase Messaging nu este suportat în acest browser.');
      return false;
    }

    try {
      // Așteptăm inițializarea Firebase
      await isFirebaseInitialized;

      // Înregistrăm service worker-ul
      await this.registerServiceWorker();

      // Solicităm permisiunea și obținem token-ul FCM
      const hasPermission = await this.requestNotificationPermission();
      if (!hasPermission) {
        console.warn('Utilizatorul a refuzat permisiunea pentru notificări.');
        return false;
      }

      // Generăm/actualizăm token-ul FCM
      await this.updateFCMToken();

      // Configurăm listener-ul pentru mesaje în prim-plan
      this.setupForegroundListener();

      return true;
    } catch (error) {
      console.error('Eroare la inițializarea Firebase Messaging:', error);
      return false;
    }
  }

  /**
   * Înregistrează Service Worker-ul pentru Firebase Messaging
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      // Înregistrăm service worker-ul - asigurăm-ne că folosim calea corectă
      // În producție, firebase-messaging-sw.js ar trebui să fie în directorul rădăcină
      const swUrl = '/firebase-messaging-sw.js';
      
      // Verificăm dacă avem deja un service worker înregistrat
      const existingRegistration = await navigator.serviceWorker.getRegistration(swUrl);
      
      if (existingRegistration) {
        console.log('Service Worker Firebase deja înregistrat, îl folosim pe cel existent', existingRegistration);
        this.swRegistration = existingRegistration;
      } else {
        // Înregistrăm un nou service worker
        this.swRegistration = await navigator.serviceWorker.register(swUrl, {
          scope: '/'
        });
        console.log('Service Worker Firebase înregistrat cu succes', this.swRegistration);
      }
      
      // Trimite configurația Firebase către Service Worker
      this.sendConfigToServiceWorker();
      
      // Ascultăm pentru actualizările service worker-ului
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller a fost schimbat, retrimitem configurația');
        this.sendConfigToServiceWorker();
      });
    } catch (error) {
      console.error('Eroare la înregistrarea service worker-ului Firebase:', error);
      
      // Încercăm o soluție alternativă folosind service worker-ul existent
      try {
        const existingRegistration = await navigator.serviceWorker.ready;
        console.log('Folosim service worker-ul existent ca fallback', existingRegistration);
        this.swRegistration = existingRegistration;
        this.sendConfigToServiceWorker();
      } catch (fallbackError) {
        console.error('Eroare și la soluția de fallback:', fallbackError);
        throw error; // Aruncăm eroarea originală
      }
    }
  }

  /**
   * Trimite configurația Firebase către Service Worker
   */
  private async sendConfigToServiceWorker(): Promise<void> {
    if (!this.swRegistration || !navigator.serviceWorker.controller) {
      console.warn('Service Worker nu este înregistrat sau activ');
      return;
    }

    // Creăm un MessageChannel pentru comunicarea bidirecțională
    const messageChannel = new MessageChannel();
    
    // Configurăm handler-ul pentru răspunsurile de la Service Worker
    messageChannel.port1.onmessage = (event) => {
      console.log('Răspuns de la Service Worker Firebase:', event.data);
    };

    // Trimitem configurația către Service Worker
    navigator.serviceWorker.controller.postMessage({
      type: 'FCM_CONFIG',
      config: {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      }
    }, [messageChannel.port2]);
  }

  /**
   * Solicită permisiunea pentru notificări
   */
  private async requestNotificationPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Eroare la solicitarea permisiunii pentru notificări:', error);
      return false;
    }
  }

  /**
   * Actualizează/generează token-ul FCM și îl înregistrează pe server
   */
  private async updateFCMToken(): Promise<void> {
    try {
      // Verificăm inițializarea Firebase
      if (!messaging) {
        console.error('Firebase Messaging nu este inițializat');
        return;
      }

      // Obținem token-ul curent
      this.fcmToken = await messaging.getToken({ 
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: this.swRegistration 
      });
      
      console.log('Token FCM obținut:', this.fcmToken);
      
      // Salvăm tokenul în cookies pentru a-l putea folosi la reîncărcarea paginii
      if (this.fcmToken) {
        Cookie.set('fcm_token', this.fcmToken, { expires: 30, secure: true, sameSite: 'Strict' });
        
        // Înregistrăm tokenul pe server
        await this.registerTokenWithServer();
      }

      // Configurăm reînnoirea automată a token-ului
      messaging.onTokenRefresh(async () => {
        console.log('Token FCM reînnoit');
        await this.updateFCMToken();
      });
    } catch (error) {
      console.error('Eroare la obținerea/actualizarea token-ului FCM:', error);
    }
  }

  /**
   * Înregistrează token-ul FCM pe server
   */
  private async registerTokenWithServer(): Promise<void> {
    if (!this.fcmToken || !this.userId || !this.userRole) {
      console.error('Lipsesc informații pentru înregistrarea token-ului FCM pe server');
      return;
    }

    try {
      const response = await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: this.fcmToken,
          userId: this.userId,
          userRole: this.userRole
        }),
      });

      if (!response.ok) {
        throw new Error(`Eroare server: ${response.status}`);
      }

      const data = await response.json();
      console.log('Token FCM înregistrat cu succes pe server:', data);
    } catch (error) {
      console.error('Eroare la înregistrarea token-ului FCM pe server:', error);
    }
  }

  /**
   * Configurează ascultătorul pentru mesaje în prim-plan
   */
  private setupForegroundListener(): void {
    if (!messaging) return;

    // Configurăm handler-ul pentru mesaje în prim-plan
    messaging.onMessage((payload: any) => {
      console.log('Mesaj primit în prim-plan:', payload);
      
      // Extragem datele din payload
      const notificationTitle = payload.notification?.title || 'Notificare nouă';
      const notificationOptions: NotificationOptions = {
        body: payload.notification?.body || 'Aveți o notificare nouă',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: payload.data?.tag || 'default',
        data: payload.data,
        vibrate: [200, 100, 200],
        requireInteraction: true
      };

      // Afișăm notificarea manual pentru mesajele în prim-plan
      this.showNotification(notificationTitle, notificationOptions);
    });
  }

  /**
   * Afișează o notificare locală (pentru mesaje în prim-plan)
   */
  private showNotification(title: string, options: NotificationOptions): void {
    if (!this.swRegistration) {
      console.warn('Service Worker nu este înregistrat, nu se poate afișa notificarea');
      return;
    }

    try {
      // Folosim Service Worker-ul pentru a afișa notificarea
      this.swRegistration.showNotification(title, options)
        .catch(error => console.error('Eroare la afișarea notificării:', error));
      
      // Redăm sunetul pentru notificare
      this.playNotificationSound();
    } catch (error) {
      console.error('Eroare la afișarea notificării:', error);
    }
  }

  /**
   * Redă un sunet pentru notificare
   */
  private playNotificationSound(): void {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.warn('Nu s-a putut reda sunetul notificării:', error);
      });
    } catch (error) {
      console.warn('Eroare la redarea sunetului notificării:', error);
    }
  }

  /**
   * Verifică dacă token-ul FCM există și este valid
   */
  public hasFCMToken(): boolean {
    return !!this.fcmToken;
  }

  /**
   * Curăță resursele și eliberează memoria
   */
  public cleanup(): void {
    this.fcmToken = null;
    this.userId = null;
    this.userRole = null;
  }
}

export default FirebaseMessaging;