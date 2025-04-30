import { messaging, messagingSupported, isFirebaseInitialized, auth } from './firebase';
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

    console.log(`Inițializare notificări pentru ${userRole} cu ID ${userId}`);

    // Verificăm dacă browserul suportă notificările și service workers
    if (!messagingSupported || !('serviceWorker' in navigator)) {
      console.warn('Firebase Messaging nu este suportat în acest browser.');
      return false;
    }

    try {
      // Așteptăm inițializarea Firebase
      await isFirebaseInitialized;

      // Verificăm și cerem permisiunile pentru notificări înainte de a înregistra service worker-ul
      const hasPermission = await this.requestNotificationPermission();
      if (!hasPermission) {
        console.warn(`Utilizatorul ${userRole} a refuzat permisiunea pentru notificări.`);
        return false;
      }
      
      console.log(`Permisiuni notificări acordate pentru ${userRole}`);

      // Înregistrăm service worker-ul
      const swRegistered = await this.registerServiceWorker();
      if (!swRegistered) {
        console.warn(`Nu s-a putut înregistra Service Worker pentru ${userRole}`);
        return false;
      }

      // Generăm/actualizăm token-ul FCM
      const tokenUpdated = await this.updateFCMToken();
      if (!tokenUpdated) {
        console.warn(`Nu s-a putut actualiza token-ul FCM pentru ${userRole}`);
        return false;
      }

      // Configurăm listener-ul pentru mesaje în prim-plan
      this.setupForegroundListener();
      
      console.log(`Sistem notificări inițializat cu succes pentru ${userRole} (ID: ${userId})`);
      return true;
    } catch (error) {
      console.error(`Eroare la inițializarea Firebase Messaging pentru ${userRole}:`, error);
      return false;
    }
  }

  /**
   * Înregistrează Service Worker-ul pentru Firebase Messaging
   * @returns {Promise<boolean>} true dacă înregistrarea a reușit, false în caz contrar
   */
  private async registerServiceWorker(): Promise<boolean> {
    try {
      // În producție, firebase-messaging-sw.js ar trebui să fie în directorul rădăcină
      const swUrl = '/firebase-messaging-sw.js';
      
      console.log(`[${this.userRole}] Înregistrare Service Worker: ${swUrl}`);
      
      // Verificăm dacă avem deja un service worker înregistrat
      const existingRegistration = await navigator.serviceWorker.getRegistration(swUrl);
      
      if (existingRegistration) {
        console.log(`[${this.userRole}] Service Worker Firebase deja înregistrat:`, existingRegistration);
        this.swRegistration = existingRegistration;
      } else {
        // Înregistrăm un nou service worker cu opțiuni îmbunătățite
        console.log(`[${this.userRole}] Înregistrare nou Service Worker...`);
        this.swRegistration = await navigator.serviceWorker.register(swUrl, {
          scope: '/',
          updateViaCache: 'none' // Nu folosim cache pentru actualizări
        });
        console.log(`[${this.userRole}] Service Worker Firebase înregistrat cu succes:`, this.swRegistration);
      }
      
      // Așteptăm activarea service worker-ului
      if (this.swRegistration.installing) {
        console.log(`[${this.userRole}] Așteptăm instalarea Service Worker...`);
        await new Promise<void>((resolve) => {
          this.swRegistration!.installing!.addEventListener('statechange', (e) => {
            if ((e.target as ServiceWorker).state === 'activated') {
              console.log(`[${this.userRole}] Service Worker activat cu succes`);
              resolve();
            }
          });
        }).catch(err => {
          console.warn(`[${this.userRole}] Eroare la așteptarea activării:`, err);
          // Continuăm oricum, poate funcționa
        });
      }
      
      // Trimite configurația Firebase către Service Worker
      const configSent = await this.sendConfigToServiceWorker();
      
      // Ascultăm pentru actualizările service worker-ului
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log(`[${this.userRole}] Service Worker controller schimbat, retrimitem configurația`);
        this.sendConfigToServiceWorker();
      });
      
      return true;
    } catch (error) {
      console.error(`[${this.userRole}] Eroare la înregistrarea service worker-ului:`, error);
      
      // Încercăm o soluție alternativă folosind service worker-ul existent
      try {
        console.log(`[${this.userRole}] Încercăm soluția de fallback...`);
        const existingRegistration = await navigator.serviceWorker.ready;
        console.log(`[${this.userRole}] Folosim service worker-ul existent:`, existingRegistration);
        this.swRegistration = existingRegistration;
        await this.sendConfigToServiceWorker();
        return true;
      } catch (fallbackError) {
        console.error(`[${this.userRole}] Eroare și la soluția de fallback:`, fallbackError);
        return false;
      }
    }
  }

  /**
   * Trimite configurația Firebase către Service Worker
   * @returns {Promise<boolean>} true dacă configurația a fost trimisă cu succes
   */
  private async sendConfigToServiceWorker(): Promise<boolean> {
    // Poate dura puțin până se activează controller-ul, așa că așteptăm dacă e necesar
    if (!navigator.serviceWorker.controller) {
      console.log(`[${this.userRole}] Așteptăm activarea controller-ului Service Worker...`);
      
      // Așteptăm maximum 3 secunde pentru controller
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout așteptând controller-ul Service Worker'));
          }, 3000);
          
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            clearTimeout(timeout);
            resolve();
          }, { once: true });
        });
      } catch (error) {
        console.warn(`[${this.userRole}] Timeout așteptând controller-ul:`, error);
      }
    }
    
    if (!this.swRegistration) {
      console.warn(`[${this.userRole}] Service Worker nu este înregistrat`);
      return false;
    }
    
    if (!navigator.serviceWorker.controller) {
      console.warn(`[${this.userRole}] Service Worker controller lipsește chiar și după așteptare`);
      return false;
    }

    return new Promise<boolean>((resolve) => {
      try {
        // Creăm un MessageChannel pentru comunicarea bidirecțională
        const messageChannel = new MessageChannel();
        
        // Timeout pentru răspuns
        const timeoutId = setTimeout(() => {
          console.warn(`[${this.userRole}] Timeout așteptând răspunsul Service Worker`);
          resolve(false);
        }, 2000);
        
        // Configurăm handler-ul pentru răspunsurile de la Service Worker
        messageChannel.port1.onmessage = (event) => {
          clearTimeout(timeoutId);
          console.log(`[${this.userRole}] Răspuns SW:`, event.data);
          resolve(event.data?.success === true);
        };

        // Adăugăm informații de user role în configurație pentru a personaliza notificările
        console.log(`[${this.userRole}] Trimit configurația către Service Worker...`);
        
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
          },
          userInfo: {
            userId: this.userId,
            userRole: this.userRole
          }
        }, [messageChannel.port2]);
      } catch (error) {
        console.error(`[${this.userRole}] Eroare la trimiterea config către SW:`, error);
        resolve(false);
      }
    });
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
  private async updateFCMToken(): Promise<boolean> {
    try {
      // Verificăm inițializarea Firebase
      if (!messaging) {
        console.error('Firebase Messaging nu este inițializat');
        return false;
      }

      // În loc să folosim FCM pentru token, generăm un token unic pentru identificare
      this.fcmToken = this.generateDeviceToken();
      
      console.log(`Token FCM generat pentru ${this.userRole}:`, this.fcmToken);
      
      // Salvăm tokenul în cookies pentru a-l putea folosi la reîncărcarea paginii
      if (this.fcmToken) {
        // Utilizăm un nume cookie diferit pentru fiecare rol pentru a evita conflictele
        const cookieName = `fcm_token_${this.userRole}`;
        Cookie.set(cookieName, this.fcmToken, { 
          expires: 30, 
          secure: true, 
          sameSite: 'Strict' 
        });
        
        // Înregistrăm tokenul pe server
        const registered = await this.registerTokenWithServer();
        return registered;
      }
      return false;
    } catch (error) {
      console.error(`Eroare la obținerea/actualizarea token-ului FCM pentru ${this.userRole}:`, error);
      return false;
    }
  }
  
  /**
   * Generează un token unic pentru dispozitiv
   */
  private generateDeviceToken(): string {
    // Generăm un ID unic folosind timestamp, random și informații despre browser
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000000000);
    const browserInfo = navigator.userAgent;
    
    // Creăm un hash simplu bazat pe aceste informații
    const tokenData = `${timestamp}-${random}-${browserInfo}`;
    
    // Convertim în base64 pentru un format mai compact
    return btoa(tokenData).substring(0, 40);
  }

  /**
   * Înregistrează token-ul FCM pe server
   */
  private async registerTokenWithServer(): Promise<boolean> {
    if (!this.fcmToken || !this.userId || !this.userRole) {
      console.error(`Lipsesc informații pentru înregistrarea token-ului FCM pe server (${this.userRole})`);
      return false;
    }

    try {
      // Obține token-ul de autentificare Firebase curent
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error(`Utilizatorul ${this.userRole} nu este autentificat pentru înregistrarea token-ului FCM`);
        return false;
      }
      
      const authToken = await currentUser.getIdToken();
      
      console.log(`Înregistrare token pentru ${this.userRole} (ID: ${this.userId})...`);
      
      const response = await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          token: this.fcmToken,
          userId: this.userId,
          userRole: this.userRole
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Eroare server: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Token FCM înregistrat cu succes pentru ${this.userRole}:`, data);
      return true;
    } catch (error) {
      console.error(`Eroare la înregistrarea token-ului FCM pentru ${this.userRole}:`, error);
      return false;
    }
  }

  /**
   * Configurează ascultătorul pentru mesaje în prim-plan
   */
  private setupForegroundListener(): void {
    // Versiune simplificată care nu folosește Firebase Messaging
    console.log('Înregistrând listener alternativ pentru mesaje în prim-plan');
    
    // În loc să folosim Firebase Messaging, creem propriul nostru EventListener
    window.addEventListener('app-notification', (event: any) => {
      console.log('Eveniment app-notification declanșat:', event.detail);
      
      const payload = event.detail;
      if (!payload) return;
      
      // Extragem datele din payload
      const notificationTitle = payload.title || 'Notificare nouă';
      const notificationOptions: NotificationOptions = {
        body: payload.body || 'Aveți o notificare nouă',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: payload.tag || 'default',
        data: payload.data || {},
        vibrate: [200, 100, 200],
        requireInteraction: true
      };

      // Afișăm notificarea
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