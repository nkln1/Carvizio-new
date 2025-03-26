/**
 * Helper pentru gestionarea notificărilor browser
 */

// Declarăm tipul pentru window pentru a evita erorile TypeScript
declare global {
  interface Window {
    showNotificationViaSW?: (title: string, options?: NotificationOptions) => Promise<any>;
    startBackgroundMessageCheck?: (options: any) => Promise<any>;
    stopBackgroundMessageCheck?: () => Promise<any>;
    swRegistration?: ServiceWorkerRegistration;
  }
}

class NotificationHelper {
  private static debugMode = true;
  private static notificationQueue: any[] = [];
  private static isProcessingQueue = false;
  private static backgroundCheckActive = false;
  private static notificationSettings = {
    enabled: true,
    silentMode: false,
    lastNotificationTime: 0,
    minTimeBetweenNotifications: 1000, // 1 second between notifications
    backgroundCheckInterval: 30000 // 30 seconds between background checks
  };

  /**
   * Verifică dacă API-ul de notificări este suportat de browser
   */
  static isSupported(): boolean {
    const supported = 'Notification' in window;
    if (this.debugMode) console.log('Notificări browser suportate:', supported);
    return supported;
  }

  /**
   * Verifică dacă Service Worker-ul este disponibil
   */
  static isServiceWorkerAvailable(): boolean {
    return 'serviceWorker' in navigator && 
           !!navigator.serviceWorker.controller &&
           typeof window.showNotificationViaSW === 'function';
  }

  /**
   * Verifică permisiunea curentă pentru notificări
   * @returns 'granted', 'denied' sau 'default'
   */
  static checkPermission(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    const permission = Notification.permission;
    if (this.debugMode) console.log('Permisiune notificări browser:', permission);
    return permission;
  }

  /**
   * Solicită permisiunea pentru notificări
   * @returns Promise<boolean> - true dacă permisiunea a fost acordată
   */
  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.error('Notificările nu sunt suportate în acest browser');
      return false;
    }

    try {
      console.log('Solicită permisiunea pentru notificări...');
      const permission = await Notification.requestPermission();
      console.log('Permisiune primită:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Eroare la solicitarea permisiunii pentru notificări:', error);
      return false;
    }
  }

  /**
   * Arată o notificare
   * @param title Titlul notificării
   * @param options Opțiuni pentru notificare
   * @returns Instanța notificării sau null în caz de eroare
   */
  static showNotification(title: string, options: NotificationOptions = {}): Promise<any> | null {
    if (!this.isSupported()) {
      console.error('Notificările nu sunt disponibile în acest browser');
      return null;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Permisiune pentru notificări neacordată, permisiune curentă:', Notification.permission);
      this.requestPermission().then(granted => {
        if (granted) {
          this.showNotification(title, options);
        }
      });
      return null;
    }

    try {
      // Verificăm dacă suntem în silent mode sau dacă a trecut suficient timp de la ultima notificare
      const now = Date.now();
      if (this.notificationSettings.silentMode || 
          (now - this.notificationSettings.lastNotificationTime < this.notificationSettings.minTimeBetweenNotifications)) {
        // Adaugă la coadă pentru procesare ulterioară
        this.notificationQueue.push({ title, options });
        if (!this.isProcessingQueue) {
          setTimeout(() => this.processNotificationQueue(), this.notificationSettings.minTimeBetweenNotifications);
        }
        return null;
      }

      this.notificationSettings.lastNotificationTime = now;
      console.log('Afișare notificare:', title, options);

      // Opțiuni implicite pentru notificări
      const defaultOptions: NotificationOptions = {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        silent: false,
        requireInteraction: true,  // Notificarea rămâne vizibilă până când utilizatorul interacționează cu ea
        ...options
      };

      // Încercăm mai întâi să folosim Service Worker dacă este disponibil
      if (this.isServiceWorkerAvailable() && window.showNotificationViaSW) {
        console.log('Folosim Service Worker pentru notificare');
        return window.showNotificationViaSW(title, defaultOptions);
      }

      // Dacă nu avem Service Worker, folosim metoda tradițională
      console.log('Folosim API Notification direct (fără Service Worker)');
      const notification = new Notification(title, defaultOptions);

      // Event handlers
      notification.onclick = () => {
        console.log('Notificare accesată de utilizator');
        window.focus();
        notification.close();
      };

      notification.onclose = () => {
        console.log('Notificare închisă');
      };

      notification.onerror = (error) => {
        console.error('Eroare la afișarea notificării:', error);
      };

      return Promise.resolve(notification);
    } catch (error) {
      console.error('Eroare la afișarea notificării:', error);

      // În caz de eroare, încercăm să folosim un alert nativ dacă este important
      if (options.requireInteraction) {
        try {
          // Folosim un setTimeout pentru a nu bloca UI
          setTimeout(() => {
            alert(`${title}: ${options.body || ''}`);
          }, 100);
        } catch (alertError) {
          console.error('Și alerta de rezervă a eșuat:', alertError);
        }
      }

      return null;
    }
  }

  /**
   * Procesează coada de notificări
   * Se asigură că nu sunt afișate prea multe notificări deodată
   */
  private static processNotificationQueue() {
    if (this.notificationQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;
    const { title, options } = this.notificationQueue.shift()!;

    this.showNotification(title, options);

    // Procesează următorul element din coadă după un interval
    if (this.notificationQueue.length > 0) {
      setTimeout(() => this.processNotificationQueue(), this.notificationSettings.minTimeBetweenNotifications);
    } else {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Metodă pentru testarea notificărilor
   */
  static testNotification(): void {
    console.log('Inițiere test notificări browser...');
    const permission = this.checkPermission();
    console.log('Test notificări. Permisiune curentă:', permission);

    if (permission === 'granted') {
      console.log('Permisiune acordată, afișăm notificarea de test');
      this.showNotification('Notificare de test', {
        body: 'Aceasta este o notificare de test. Dacă vedeți acest mesaj, notificările în browser funcționează corect.',
        icon: '/favicon.ico',
        tag: 'test-notification',
        requireInteraction: true
      });

      // Emitem și un eveniment de testare pentru a verifica și prin Service Worker
      if (this.isServiceWorkerAvailable() && navigator.serviceWorker.controller) {
        console.log('Testăm și notificarea prin Service Worker');
        try {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
              title: 'Test Service Worker',
              body: 'Aceasta este o notificare de test prin Service Worker',
              tag: 'test-sw-notification',
              requireInteraction: true
            }
          });
        } catch (error) {
          console.error('Eroare la trimiterea mesajului de test către Service Worker:', error);
        }
      }
    } else {
      console.warn('Nu se poate testa notificarea - permisiunea nu este acordată');
      // Încercăm să solicităm permisiunea dacă nu este denial
      if (permission !== 'denied') {
        this.requestPermission().then(granted => {
          if (granted) {
            console.log('Permisiune acordată după solicitare, testăm notificarea');
            this.testNotification();
          } else {
            console.log('Permisiune refuzată de utilizator');
          }
        });
      }
    }
  }

  /**
   * Forțează afișarea unei notificări pentru mesaj nou - utilizat în debugging
   */
  static forceMessageNotification(content: string): void {
    if (this.checkPermission() !== 'granted') {
      console.warn('Nu se poate forța notificarea - permisiunea nu este acordată');
      this.requestPermission().then(granted => {
        if (granted) {
          this.forceMessageNotification(content);
        }
      });
      return;
    }

    console.log('Forțăm afișarea notificării pentru mesaj nou:', content);

    // Asigurăm-ne că conținutul este într-adevăr un string
    const safeContent = content || 'Ați primit un mesaj nou';

    // Adăugăm timestamp în tag pentru a evita ignorarea notificărilor duplicate
    const timestamp = new Date().getTime();
    const tag = `message-${timestamp}`;

    // Folosim Service Worker dacă este disponibil
    if (this.isServiceWorkerAvailable() && window.showNotificationViaSW) {
      console.log('Folosim Service Worker pentru notificarea de mesaj');
      window.showNotificationViaSW('Mesaj nou', {
        body: safeContent,
        icon: '/favicon.ico',
        tag: tag,
        requireInteraction: true,
        data: {
          url: '/service-dashboard?tab=messages'
        }
      });
    } else {
      // Folosim metoda obișnuită dacă Service Worker nu e disponibil
      this.showNotification('Mesaj nou', {
        body: safeContent,
        icon: '/favicon.ico',
        tag: tag,
        requireInteraction: true
      });
    }

    // Emitem și un eveniment pentru debugging sau pentru alte componente care ar putea asculta
    try {
      const notificationEvent = new CustomEvent('message-notification', {
        detail: { content: safeContent, timestamp }
      });
      window.dispatchEvent(notificationEvent);
    } catch (error) {
      console.error('Eroare la emiterea evenimentului de notificare:', error);
    }
  }

  /**
   * Activează sau dezactivează modul silențios
   * În modul silențios, notificările sunt puse în coadă, dar nu sunt afișate imediat
   */
  static setSilentMode(silent: boolean): void {
    this.notificationSettings.silentMode = silent;
    console.log(`Mod silențios ${silent ? 'activat' : 'dezactivat'}`);

    // Dacă dezactivăm modul silențios, procesăm coada
    if (!silent && this.notificationQueue.length > 0 && !this.isProcessingQueue) {
      this.processNotificationQueue();
    }
  }

  /**
   * Golește coada de notificări
   */
  static clearNotificationQueue(): void {
    const count = this.notificationQueue.length;
    this.notificationQueue = [];
    console.log(`Coada de notificări golită, ${count} notificări eliminate`);
  }

  /**
   * Metoda pentru gestionarea evenimentelor de notificare
   * @param data Datele evenimentului pentru afișarea notificării
   */
  static handleNotificationEvent(data: any): void {
    console.log('Procesare eveniment notificare:', data);

    if (!data || !data.type) {
      console.warn('Date de notificare invalide:', data);
      return;
    }

    // Verificăm permisiunea înainte de toate
    if (this.checkPermission() !== 'granted') {
      console.warn('Nu se poate afișa notificarea - permisiunea nu este acordată');
      // Solicităm permisiunea dacă nu avem un refuz clar
      if (this.checkPermission() === 'default') {
        this.requestPermission().then(granted => {
          if (granted) {
            console.log('Permisiune acordată, reîncercăm afișarea notificării');
            this.handleNotificationEvent(data);
          }
        });
      }
      return;
    }

    // Verificăm configurările de notificări
    this.getNotificationPreferences().then(preferences => {
      const shouldShowNotification = this.shouldShowNotification(data, preferences);

      if (shouldShowNotification) {
        // În funcție de tipul de eveniment, determinăm URL-ul către care să redirecționăm
        let notificationUrl = '/service-dashboard';

        if (data.type === 'NEW_MESSAGE') {
          notificationUrl = '/service-dashboard?tab=messages';
        } else if (data.type === 'NEW_REQUEST') {
          notificationUrl = '/service-dashboard?tab=requests';
        } else if (data.type === 'OFFER_STATUS_CHANGED' && data.payload?.status === 'Accepted') {
          notificationUrl = '/service-dashboard?tab=offers';
        }

        // Verificăm tipul de eveniment și afișăm notificarea corespunzătoare
        switch (data.type) {
          case 'NEW_MESSAGE':
            console.log('Afișăm notificare pentru mesaj nou:', data.payload);
            if (this.isServiceWorkerAvailable() && window.showNotificationViaSW) {
              window.showNotificationViaSW('Mesaj nou', {
                body: data.payload?.content || 'Ați primit un mesaj nou',
                icon: '/favicon.ico',
                tag: `message-${Date.now()}`,
                requireInteraction: true,
                data: { url: notificationUrl }
              });
            } else {
              this.showNotification('Mesaj nou', {
                body: data.payload?.content || 'Ați primit un mesaj nou',
                icon: '/favicon.ico',
                tag: `message-${Date.now()}`,
                requireInteraction: true
              });
            }
            break;
          case 'NEW_OFFER':
            if (this.isServiceWorkerAvailable() && window.showNotificationViaSW) {
              window.showNotificationViaSW('Ofertă nouă', {
                body: data.payload?.title || 'Ați primit o ofertă nouă',
                icon: '/favicon.ico',
                requireInteraction: true,
                data: { url: notificationUrl }
              });
            } else {
              this.showNotification('Ofertă nouă', {
                body: data.payload?.title || 'Ați primit o ofertă nouă',
                icon: '/favicon.ico',
                requireInteraction: true
              });
            }
            break;
          case 'NEW_REQUEST':
            if (this.isServiceWorkerAvailable() && window.showNotificationViaSW) {
              window.showNotificationViaSW('Cerere nouă', {
                body: data.payload?.title || 'Ați primit o cerere nouă',
                icon: '/favicon.ico',
                requireInteraction: true,
                data: { url: notificationUrl }
              });
            } else {
              this.showNotification('Cerere nouă', {
                body: data.payload?.title || 'Ați primit o cerere nouă',
                icon: '/favicon.ico',
                requireInteraction: true
              });
            }
            break;
          case 'OFFER_STATUS_CHANGED':
            if (data.payload?.status === 'Accepted') {
              if (this.isServiceWorkerAvailable() && window.showNotificationViaSW) {
                window.showNotificationViaSW('Ofertă acceptată', {
                  body: 'O ofertă trimisă de dvs. a fost acceptată',
                  icon: '/favicon.ico',
                  requireInteraction: true,
                  data: { url: notificationUrl }
                });
              } else {
                this.showNotification('Ofertă acceptată', {
                  body: 'O ofertă trimisă de dvs. a fost acceptată',
                  icon: '/favicon.ico',
                  requireInteraction: true
                });
              }
            }
            break;
          default:
            console.log('Tip de eveniment necunoscut pentru notificare:', data.type);
        }
      } else {
        console.log(`Notificare pentru ${data.type} suprimată conform preferințelor utilizatorului`);
      }
    });
  }

  /**
   * Obține preferințele de notificări din API sau folosește valorile implicite
   */
  static async getNotificationPreferences(): Promise<any> {
    try {
      // Încercăm să obținem preferințele de la API
      const response = await fetch('/api/service/notification-preferences');

      if (!response.ok) {
        console.warn('Nu am putut obține preferințele de notificări de la API, folosim valori implicite');
        return this.getDefaultNotificationPreferences();
      }

      const preferences = await response.json();
      return preferences;
    } catch (error) {
      console.error('Eroare la obținerea preferințelor de notificări:', error);
      return this.getDefaultNotificationPreferences();
    }
  }

  /**
   * Returnează preferințele implicite pentru notificări
   */
  static getDefaultNotificationPreferences(): any {
    return {
      emailNotificationsEnabled: true,
      newRequestEmailEnabled: true,
      acceptedOfferEmailEnabled: true,
      newMessageEmailEnabled: true,
      newReviewEmailEnabled: true,
      browserNotificationsEnabled: true,
      newRequestBrowserEnabled: true,
      acceptedOfferBrowserEnabled: true,
      newMessageBrowserEnabled: true,
      newReviewBrowserEnabled: true,
      browserPermission: this.checkPermission() === 'granted'
    };
  }

  /**
   * Verifică dacă trebuie să afișăm notificarea în funcție de preferințele utilizatorului
   */
  static shouldShowNotification(data: any, preferences: any): boolean {
    // Verifică dacă notificările sunt activate global
    if (!preferences.browserNotificationsEnabled) {
      return false;
    }

    // Verifică tipul specific de notificare
    switch (data.type) {
      case 'NEW_MESSAGE':
        return preferences.newMessageBrowserEnabled;
      case 'NEW_OFFER':
        return preferences.newRequestBrowserEnabled;
      case 'NEW_REQUEST':
        return preferences.newRequestBrowserEnabled;
      case 'OFFER_STATUS_CHANGED':
        return preferences.acceptedOfferBrowserEnabled && data.payload?.status === 'Accepted';
      default:
        return false;
    }
  }

  /**
   * Pornește verificarea mesajelor în fundal folosind Service Worker
   * Această funcție va permite verificarea mesajelor chiar și când tab-ul este inactiv
   * @param userId ID-ul utilizatorului curent
   * @param userRole Rolul utilizatorului ('client' sau 'service')
   * @param token Token-ul de autentificare
   */
  static startBackgroundMessageCheck(userId: number, userRole: 'client' | 'service', token: string): void {
    // Verificăm dacă Service Worker-ul este disponibil
    if (!this.isServiceWorkerAvailable() || !window.startBackgroundMessageCheck) {
      console.warn('Service Worker nu este disponibil pentru verificarea mesajelor în fundal');
      return;
    }

    // Dacă verificarea este deja activă, o oprim mai întâi
    if (this.backgroundCheckActive) {
      this.stopBackgroundMessageCheck();
    }

    console.log('Pornire verificare mesaje în fundal pentru utilizator:', userId, 'rol:', userRole);

    const options = {
      userId,
      userRole,
      token,
      interval: this.notificationSettings.backgroundCheckInterval
    };

    // Pornim verificarea și marcăm ca activă
    window.startBackgroundMessageCheck(options)
      .then(() => {
        this.backgroundCheckActive = true;
        console.log('Verificare mesaje în fundal pornită cu succes');
      })
      .catch(error => {
        console.error('Eroare la pornirea verificării mesajelor în fundal:', error);
      });
  }

  /**
   * Oprește verificarea mesajelor în fundal
   */
  static stopBackgroundMessageCheck(): void {
    if (!this.isServiceWorkerAvailable() || !window.stopBackgroundMessageCheck) {
      console.warn('Service Worker nu este disponibil pentru oprirea verificării mesajelor în fundal');
      return;
    }

    if (this.backgroundCheckActive) {
      window.stopBackgroundMessageCheck()
        .then(() => {
          this.backgroundCheckActive = false;
          console.log('Verificare mesaje în fundal oprită cu succes');
        })
        .catch(error => {
          console.error('Eroare la oprirea verificării mesajelor în fundal:', error);
        });
    }
  }

  /**
   * Verifică starea verificării mesajelor în fundal
   * @returns boolean - true dacă verificarea este activă, false altfel
   */
  static isBackgroundCheckActive(): boolean {
    return this.backgroundCheckActive;
  }
}

// Adăugăm referințe globale pentru funcțiile Service Worker dacă nu există
if (typeof window !== 'undefined') {
  if (!window.showNotificationViaSW) {
    window.showNotificationViaSW = (title: string, options: any = {}) => {
      console.warn('Service Worker nu este disponibil, folosim notificări standard');
      const notification = new Notification(title, options);
      return Promise.resolve(notification);
    };
  }

  if (!window.startBackgroundMessageCheck) {
    window.startBackgroundMessageCheck = (options: any = {}) => {
      console.warn('Service Worker nu este disponibil, nu se poate porni verificarea mesajelor în fundal');
      return Promise.reject(new Error('Service Worker nu este disponibil'));
    };
  }

  if (!window.stopBackgroundMessageCheck) {
    window.stopBackgroundMessageCheck = () => {
      console.warn('Service Worker nu este disponibil, nu este necesară oprirea verificării mesajelor în fundal');
      return Promise.resolve();
    };
  }
}

// Exportăm clasa pentru a putea fi folosită în alte componente
export default NotificationHelper;