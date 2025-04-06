/**
 * Helper pentru gestionarea notificărilor browser
 */

// Interfață pentru opțiunile de verificare în fundal
export interface BackgroundCheckOptions {
  userId: number;
  userRole: string;
  token?: string;
  interval?: number;
}

// Declarăm tipul pentru window pentru a evita erorile TypeScript
declare global {
  interface Window {
    showNotificationViaSW?: (title: string, options?: NotificationOptions) => Promise<any>;
    startBackgroundMessageCheck?: (options: BackgroundCheckOptions) => Promise<any>;
    stopBackgroundMessageCheck?: () => Promise<any>;
    swRegistration?: ServiceWorkerRegistration;
    getAuthToken?: () => Promise<string | null>;
  }
}

class NotificationHelper {
  private static debugMode = true;
  private static notificationQueue: any[] = [];
  private static isProcessingQueue = false;
  // Modificăm de la private la public pentru a permite accesul din alte părți ale codului
  public static backgroundCheckActive = false;
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
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasController = !!navigator.serviceWorker?.controller;
    const hasNotificationFunction = typeof window.showNotificationViaSW === 'function';

    console.log('[Diagnostic] Service Worker disponibilitate:', { 
      hasServiceWorker, 
      hasController, 
      hasNotificationFunction,
      serviceWorkerState: navigator.serviceWorker?.controller?.state
    });

    return hasServiceWorker && hasController && hasNotificationFunction;
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
   * Testează funcționalitatea notificărilor afișând o notificare de test
   */
  static testNotification(): Promise<boolean> {
    if (!this.isSupported() || this.checkPermission() !== 'granted') {
      console.warn('Notificările nu sunt suportate sau permisiunea nu a fost acordată');
      return Promise.resolve(false);
    }

    // Generăm un ID pentru a urmări răspunsul
    const messageId = `test-${Date.now()}`;

    console.log('Trimitere notificare de test cu ID:', messageId);

    try {
      // Avem Service Worker activ?
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        return new Promise<boolean>((resolve) => {
          // Setăm listener pentru răspuns
          const responseHandler = (event: MessageEvent) => {
            if (event.data && event.data.id === messageId) {
              console.log('Răspuns primit pentru testul de notificare:', event.data);

              // Eliminăm listener-ul
              navigator.serviceWorker.removeEventListener('message', responseHandler);

              // Rezolvăm promise-ul
              resolve(event.data.success === true);
            }
          };

          // Adăugăm listener pentru răspuns
          navigator.serviceWorker.addEventListener('message', responseHandler);

          // Trimitem mesajul către Service Worker
          navigator.serviceWorker.controller.postMessage({
            type: 'TEST_NOTIFICATION',
            id: messageId,
            payload: {
              title: 'Test notificare',
              body: 'Aceasta este o notificare de test. Notificările funcționează corect!',
              tag: 'test-notification',
              url: '/'
            }
          });

          // Timeout pentru a evita așteptarea la infinit
          setTimeout(() => {
            navigator.serviceWorker.removeEventListener('message', responseHandler);
            resolve(false);
            console.warn('Timeout la testarea notificării');
          }, 5000);
        });
      } else {
        console.warn('Service Worker nu este disponibil, folosim notificări native');

        // Fallback la notificări native
        const notification = new Notification('Test notificare', {
          body: 'Aceasta este o notificare de test. Notificările funcționează corect!',
          icon: '/favicon.ico'
        });

        return Promise.resolve(!!notification);
      }
    } catch (error) {
      console.error('Eroare la testarea notificării:', error);
      return Promise.resolve(false);
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
    // Verificăm întâi setarea globală
    if (!preferences || !preferences.browserNotificationsEnabled) {
      console.log('Notificările browser sunt dezactivate global');
      return false;
    }

    // Verificăm dacă tipul este valid și respectă preferințele specifice
    switch (data.type) {
      case 'NEW_MESSAGE':
        console.log('Verificăm preferința pentru mesaje noi:', preferences.newMessageBrowserEnabled);
        return preferences.newMessageBrowserEnabled !== false; // Implicit activat dacă nu există

      case 'NEW_OFFER':
        console.log('Verificăm preferința pentru oferte noi');
        return true; // Nu există o preferință specifică pentru acest tip

      case 'NEW_REQUEST':
        console.log('Verificăm preferința pentru cereri noi:', preferences.newRequestBrowserEnabled);
        return preferences.newRequestBrowserEnabled !== false;

      case 'OFFER_STATUS_CHANGED':
        if (data.payload?.status === 'Accepted') {
          console.log('Verificăm preferința pentru oferte acceptate:', preferences.acceptedOfferBrowserEnabled);
          return preferences.acceptedOfferBrowserEnabled !== false;
        }
        return false;

      case 'NEW_REVIEW':
        console.log('Verificăm preferința pentru recenzii noi:', preferences.newReviewBrowserEnabled);
        return preferences.newReviewBrowserEnabled !== false;

      default:
        console.log('Tip de notificare necunoscut:', data.type);
        return false;
    }
  }

  /**
   * Pornește verificarea mesajelor în fundal folosind Service Worker sau polling
   * Această funcție va permite verificarea mesajelor chiar și când tab-ul este inactiv
   * @param userId ID-ul utilizatorului pentru care verificăm mesajele
   * @param userRole Rolul utilizatorului ('client' sau 'service')
   * @param token Tokenul de autentificare (opțional)
   */
  static startBackgroundMessageCheck(userId: number, userRole: string, token?: string): Promise<any> {
    console.log(`[NotificationHelper] Pornire verificare mesaje pentru utilizator ${userId} (${userRole})`);

    // Marcăm verificarea ca activă indiferent de Service Worker
    this.backgroundCheckActive = true;

    // Verificăm dacă avem datele minime necesare
    if (!userId || !userRole) {
      const errorMsg = 'Date lipsă pentru verificarea mesajelor în fundal: ' + 
                      (!userId ? 'userId lipsă' : '') + 
                      (!userRole ? 'userRole lipsă' : '');
      console.error('[NotificationHelper]', errorMsg);
      return Promise.reject(new Error(errorMsg));
    }

    // Oprim orice verificare existentă înainte de a porni una nouă
    // Acest lucru asigură că nu avem verificări multiple active
    this.stopBackgroundMessageCheck();

    // Obținem token-ul din localStorage dacă nu a fost furnizat
    let authToken = token;
    if (!authToken || authToken === 'undefined' || authToken === 'null') {
      // Încercăm toate sursele posibile pentru token
      authToken = localStorage.getItem('firebase_auth_token') || 
                  localStorage.getItem('authToken') || 
                  sessionStorage.getItem('firebase_auth_token') || 
                  sessionStorage.getItem('authToken') || '';

      console.log('[NotificationHelper] Token obținut din storage:', authToken ? 'Da (lungime ' + authToken.length + ')' : 'Nu');
    }

    // Verificare suplimentară a validității tokenului - ar trebui să fie un șir non-gol
    if (!authToken || authToken === 'undefined' || authToken === 'null') {
      console.warn('[NotificationHelper] Token invalid sau lipsă pentru verificarea mesajelor');
      // Continuăm oricum, dar semnalăm problema
    }

    // Pregătim opțiunile pentru verificare
    const options = {
      userId, 
      userRole, 
      token: authToken,
      interval: 30000 // 30 secunde între verificări
    };

    // Log pentru debugging
    console.log('[NotificationHelper] Opțiuni verificare mesaje:', {
      userId: options.userId,
      userRole: options.userRole,
      hasToken: !!options.token,
      tokenLength: options.token ? options.token.length : 0
    });

    // Verificăm dacă Service Worker este disponibil
    if (!this.isServiceWorkerAvailable()) {
      console.log('[NotificationHelper] Service Worker nu este disponibil, folosim polling din client');
      // Implementăm un fallback cu polling direct din client
      this.startClientSidePolling(options);
      return Promise.resolve({ success: true, message: 'Client-side polling started' });
    }

    return new Promise<any>((resolve, reject) => {
      if (typeof window.startBackgroundMessageCheck !== 'function') {
        console.log('[NotificationHelper] Funcția de verificare de fundal nu este disponibilă, folosim polling din client');
        this.startClientSidePolling(options);
        resolve({ success: true, message: 'Client-side polling started' });
        return;
      }

      console.log('[NotificationHelper] Trimitere comandă către Service Worker pentru verificarea mesajelor');

      try {
        // Setăm un timeout pentru a evita blocarea în cazul în care Service Worker nu răspunde
        const timeoutId = setTimeout(() => {
          console.warn('[NotificationHelper] Timeout la comunicarea cu Service Worker, folosim polling din client');
          this.startClientSidePolling(options);
          resolve({ success: true, message: 'Client-side polling started after timeout', fallback: true });
        }, 3000);

        // Trimitem comanda către Service Worker
        window.startBackgroundMessageCheck(options)
          .then((result) => {
            clearTimeout(timeoutId);
            console.log('[NotificationHelper] Verificare mesaje în fundal pornită cu succes:', result);
            resolve({ success: true, message: 'Background check started successfully', result });
          })
          .catch(error => {
            clearTimeout(timeoutId);
            console.error('[NotificationHelper] Eroare la pornirea verificării mesajelor în fundal:', error);

            // În caz de eroare, încercăm fallback-ul cu polling din client
            console.log('[NotificationHelper] Folosim polling din client ca fallback după eroare');
            this.startClientSidePolling(options);
            resolve({ success: true, message: 'Client-side polling started as fallback', error, fallback: true });
          });
      } catch (error) {
        console.error('[NotificationHelper] Excepție la pornirea verificării mesajelor:', error);

        // În caz de excepție, folosim polling din client
        this.startClientSidePolling(options);
        resolve({ success: true, message: 'Client-side polling started after exception', error, fallback: true });
      }
    });
  }


  /**
   * Oprește verificarea mesajelor în fundal
   */
  static stopBackgroundMessageCheck(): void {
    console.log('Încercare de oprire a verificării mesajelor în fundal. Stare verificare activă:', this.backgroundCheckActive);

    // Oprim întotdeauna polling-ul din client, indiferent de starea Service Worker-ului
    if (this.clientSidePollingInterval) {
      console.log('Oprire polling client-side activ');
      clearInterval(this.clientSidePollingInterval);
      this.clientSidePollingInterval = null;
    }

    // Verificăm dacă Service Worker-ul este disponibil
    if (!this.isServiceWorkerAvailable() || !window.stopBackgroundMessageCheck) {
      console.warn('Service Worker nu este disponibil pentru oprirea verificării mesajelor în fundal');
      this.backgroundCheckActive = false;
      return;
    }

    // Chiar dacă verificarea nu pare activă, încercăm să oprim verificarea din Service Worker
    // pentru a ne asigura că nu există verificări active
    console.log('Trimitere comandă de oprire către Service Worker...');
    window.stopBackgroundMessageCheck()
      .then((result) => {
        this.backgroundCheckActive = false;
        console.log('Verificare mesaje în fundal oprită cu succes:', result);

        // Adăugăm un log suplimentar în console pentru a confirma utilizatorului
        console.log('%cNotificările au fost dezactivate cu succes', 'color: green; font-weight: bold;');
      })
      .catch(error => {
        console.error('Eroare la oprirea verificării mesajelor în fundal:', error);

        // Încercăm să forțăm oprirea verificării
        this.backgroundCheckActive = false;
      });
  }

  private static clientSidePollingInterval: any;

  private static async startClientSidePolling(options: BackgroundCheckOptions) {
    console.log('[NotificationHelper] Pornire polling client-side pentru verificarea mesajelor');

    // Oprim orice interval existent înainte de a începe unul nou
    if (this.clientSidePollingInterval) {
      clearInterval(this.clientSidePollingInterval);
      this.clientSidePollingInterval = null;
    }

    // Log pentru debugging
    console.log('[NotificationHelper] Polling configurat pentru utilizator:', options.userId, 'rol:', options.userRole);

    this.clientSidePollingInterval = setInterval(async () => {
      try {
        console.log('[NotificationHelper] Polling pentru mesaje noi...');

        // Obținem tokenul de autentificare din toate sursele posibile
        let token = options.token;

        // Dacă tokenul nu există sau este invalid, încercăm să-l obținem din alte surse
        if (!token || token === 'undefined' || token === 'null') {
          // Încercăm metoda globală
          if (window.getAuthToken) {
            try {
              const authToken = await window.getAuthToken();
              if (authToken && authToken !== 'null' && authToken !== 'undefined') {
                token = authToken;
                console.log('[NotificationHelper] Token obținut din window.getAuthToken');
              }
            } catch (error) {
              console.warn('[NotificationHelper] Eroare la obținerea tokenului prin window.getAuthToken:', error);
            }
          }

          // Încercăm localStorage și sessionStorage dacă încă nu avem token
          if (!token || token === 'undefined' || token === 'null') {
            token = localStorage.getItem('firebase_auth_token') || 
                    localStorage.getItem('authToken') || 
                    sessionStorage.getItem('firebase_auth_token') || 
                    sessionStorage.getItem('authToken') || '';

            console.log('[NotificationHelper] Token obținut din storage:', token ? 'disponibil' : 'indisponibil');

            // Actualizăm token-ul în opțiuni pentru verificările viitoare
            if (token && token !== 'undefined' && token !== 'null') {
              options.token = token;
            }
          }
        }

        // Verificăm dacă avem un token valid
        if (!token || token === 'undefined' || token === 'null') {
          console.log('[NotificationHelper] Token invalid sau lipsă pentru polling');
          return;
        }

        // Adăugăm informații de debugging pentru a urmări tokenul
        console.log('[NotificationHelper] Verificare mesaje cu token valid (lungime:', token.length, ')');

        // Facem cererea API pentru verificarea mesajelor noi
        const response = await fetch(`/api/messages?userId=${options.userId}&userRole=${options.userRole}&token=${token}`);

        if (!response.ok) {
          console.error('[NotificationHelper] Eroare la verificarea mesajelor prin polling:', response.status);

          // Verificăm dacă este o eroare de autentificare
          if (response.status === 401 || response.status === 403) {
            console.warn('[NotificationHelper] Eroare de autentificare, ștergem tokenul pentru următoarea verificare');
            options.token = undefined; // Forțăm reîncercarea obținerii unui token nou
          }

          return;
        }

        // Verificăm content-type pentru a evita erori de parsare JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('[NotificationHelper] Răspunsul nu este JSON valid:', contentType);
          return;
        }

        // Procesăm mesajele primite
        const newMessages = await response.json();
        console.log('[NotificationHelper] Mesaje primite prin polling:', newMessages ? newMessages.length : 0);

        if (newMessages && newMessages.length > 0) {
          // Afișăm notificare pentru fiecare mesaj nou
          newMessages.forEach((msg: any) => {
            if (msg && msg.content) {
              console.log('[NotificationHelper] Afișare notificare pentru mesaj nou');
              NotificationHelper.forceMessageNotification(msg.content);
            }
          });
        }
      } catch (error) {
        console.error('[NotificationHelper] Eroare la verificarea mesajelor prin polling:', error);
      }
    }, options.interval || this.notificationSettings.backgroundCheckInterval);
  }

  /**
   * Verifică starea verificării mesajelor în fundal
   * @returns boolean - true dacă verificarea este activă, false altfel
   */
  static isBackgroundCheckActive(): boolean {
    return this.backgroundCheckActive;
  }

  /**
   * Pornește verificarea periodică a mesajelor în fundal prin Service Worker
   * @param userId ID-ul utilizatorului autentificat
   * @param userRole Rolul utilizatorului (client sau service)
   * @param token Token-ul de autentificare Firebase
   * @param options Opțiuni pentru verificare (interval, etc.)
   */
  static startBackgroundMessageCheck(
    userId: number,
    userRole: string,
    token: string | undefined,
    options: any = {}
  ): Promise<any> {
    // Verificăm dacă browserul suportă notificările
    if (!this.isSupported()) {
      console.error('Browserul nu suportă notificările, nu se poate porni verificarea în fundal');
      return Promise.reject(new Error('Browserul nu suportă notificările'));
    }

    // Verificăm permisiunea pentru notificări
    if (this.checkPermission() !== 'granted') {
      console.error('Permisiunea pentru notificări nu este acordată, nu se poate porni verificarea în fundal');
      return Promise.reject(new Error('Permisiunea pentru notificări nu este acordată'));
    }

    console.log('Inițiere pornire verificare în fundal cu Service Worker');

    // Ne asigurăm că avem un Service Worker înregistrat și activ
    return this.ensureServiceWorkerReady().then(() => {
      // Salvăm configurația curentă
      this.userId = userId;
      this.userRole = userRole;
      this.authToken = token;

      // Generăm un ID unic pentru mesaj
      const messageId = `bg_check_${Date.now()}`;

      // Setăm flag-ul pentru verificare activă
      this.backgroundCheckActive = true;

      console.log('Service Worker pregătit, trimit cererea de verificare în fundal');

      // Trimitem mesajul către Service Worker
      return new Promise((resolve, reject) => {
        // Configurăm handler-ul pentru răspunsuri
        const messageHandler = (event: MessageEvent) => {
          if (event.data && event.data.id === messageId) {
            console.log('Răspuns de la Service Worker pentru cererea de verificare în fundal:', event.data);

            // Eliminăm listener-ul pentru răspunsuri
            navigator.serviceWorker.removeEventListener('message', messageHandler);

            // Verificăm dacă am primit un răspuns de succes
            if (event.data.success) {
              resolve(event.data.result || { success: true });
            } else {
              // Resetăm flag-ul de verificare activă
              this.backgroundCheckActive = false;
              reject(new Error(event.data.error || 'Eroare la pornirea verificării în fundal'));
            }
          }
        };

        // Adăugăm listener-ul pentru răspunsuri
        navigator.serviceWorker.addEventListener('message', messageHandler);

        try {
          // Trimitem mesajul către Service Worker
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'START_BACKGROUND_MESSAGE_CHECK',
              id: messageId,
              payload: {
                userId,
                userRole,
                token,
                interval: options.interval || this.notificationSettings.backgroundCheckInterval
              }
            });

            console.log('Mesaj pentru verificare în fundal trimis către Service Worker');

            // Setăm un timeout pentru răspuns
            setTimeout(() => {
              // Eliminăm listener-ul pentru răspunsuri
              navigator.serviceWorker.removeEventListener('message', messageHandler);

              // Resetăm flag-ul de verificare activă dacă nu am primit răspuns
              if (this.backgroundCheckActive) {
                console.warn('Nu s-a primit răspuns la cererea de verificare în fundal, continuăm oricum');
                resolve({ success: true, warning: 'Timeout la cererea de verificare în fundal' });
              }
            }, 5000);
          } else {
            console.error('Service Worker controller nu este disponibil');
            reject(new Error('Service Worker controller nu este disponibil'));
          }
        } catch (error) {
          // Eliminăm listener-ul pentru răspunsuri
          navigator.serviceWorker.removeEventListener('message', messageHandler);

          // Resetăm flag-ul de verificare activă
          this.backgroundCheckActive = false;

          console.error('Eroare la trimiterea mesajului către Service Worker:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Ne asigurăm că Service Worker-ul este înregistrat și activ
   */
  private static ensureServiceWorkerReady(): Promise<ServiceWorkerRegistration> {
    return new Promise((resolve, reject) => {
      if (!navigator.serviceWorker) {
        reject(new Error('Service Worker nu este suportat în acest browser'));
        return;
      }

      // Verificăm dacă avem deja un controller activ
      if (navigator.serviceWorker.controller) {
        console.log('Service Worker controller existent:', navigator.serviceWorker.controller);

        // Verificăm dacă există o înregistrare activă
        navigator.serviceWorker.ready.then(registration => {
          console.log('Service Worker este pregătit:', registration);
          resolve(registration);
        }).catch(error => {
          console.error('Eroare la verificarea Service Worker ready:', error);
          reject(error);
        });
      } else {
        console.log('Nu există un Service Worker controller, încerc înregistrarea sau așteptarea activării');

        // Verificăm dacă există înregistrări
        navigator.serviceWorker.getRegistrations().then(registrations => {
          if (registrations.length > 0) {
            console.log('Service Worker înregistrat, dar nu este activ. Așteptăm activarea...');

            // Așteptăm activarea
            const activationHandler = () => {
              console.log('Service Worker activat');
              navigator.serviceWorker.removeEventListener('controllerchange', activationHandler);

              // Așteptăm încă puțin pentru a ne asigura că Service Worker-ul este complet inițializat
              setTimeout(() => {
                navigator.serviceWorker.ready.then(resolve).catch(reject);
              }, 500);
            };

            navigator.serviceWorker.addEventListener('controllerchange', activationHandler);

            // Setăm un timeout pentru cazul în care activarea nu se întâmplă
            setTimeout(() => {
              navigator.serviceWorker.removeEventListener('controllerchange', activationHandler);
              if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(resolve).catch(reject);
              } else {
                reject(new Error('Timeout la așteptarea activării Service Worker-ului'));
              }
            }, 5000);
          } else {
            console.log('Niciun Service Worker înregistrat, încerc înregistrarea...');

            // Înregistrăm un nou Service Worker
            const timestamp = Date.now();
            navigator.serviceWorker.register(`/sw.js?t=${timestamp}&v=1.1.0`, { scope: '/' })
              .then(registration => {
                console.log('Service Worker înregistrat cu succes:', registration);

                // Așteptăm activarea
                const activationHandler = () => {
                  console.log('Service Worker nou activat');
                  navigator.serviceWorker.removeEventListener('controllerchange', activationHandler);

                  navigator.serviceWorker.ready.then(resolve).catch(reject);
                };

                navigator.serviceWorker.addEventListener('controllerchange', activationHandler);

                // Setăm un timeout pentru cazul în care activarea nu se întâmplă
                setTimeout(() => {
                  navigator.serviceWorker.removeEventListener('controllerchange', activationHandler);
                  if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(resolve).catch(reject);
                  } else {
                    reject(new Error('Timeout la așteptarea activării Service Worker-ului nou înregistrat'));
                  }
                }, 5000);
              })
              .catch(error => {
                console.error('Eroare la înregistrarea Service Worker-ului:', error);
                reject(error);
              });
          }
        }).catch(error => {
          console.error('Eroare la verificarea înregistrărilor Service Worker:', error);
          reject(error);
        });
      }
    });
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

  // Adăugăm funcția pentru obținerea token-ului de autentificare pentru Service Worker
  if (!window.getAuthToken) {
    window.getAuthToken = async () => {
      try {
        // Încercăm toate sursele posibile pentru token
        const authToken = localStorage.getItem('firebase_auth_token') || 
                        localStorage.getItem('authToken') || 
                        sessionStorage.getItem('firebase_auth_token') || 
                        sessionStorage.getItem('authToken');

        console.log('[getAuthToken] Furnizăm token de autentificare către Service Worker', 
                    authToken ? 'Token găsit (lungime ' + authToken.length + ')' : 'Token lipsă');

        if (!authToken || authToken === 'undefined' || authToken === 'null') {
          console.warn('[getAuthToken] Nu s-a găsit un token valid în storage');
          return null;
        }

        return authToken;
      } catch (error) {
        console.error('[getAuthToken] Eroare la obținerea token-ului de autentificare:', error);
        return null;
      }
    };
  }

  // Adăugăm eveniment pentru ascultarea mesajelor de la Service Worker
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      console.log('[ServiceWorker Message Listener] Mesaj primit:', event.data?.type || 'fără tip');

      // Verificăm dacă este o cerere pentru token de autentificare
      if (event.data && event.data.type === 'REQUEST_AUTH_TOKEN') {
        try {
          // Folosim aceeași logică ca în getAuthToken pentru a fi consecvenți
          const token = localStorage.getItem('firebase_auth_token') || 
                      localStorage.getItem('authToken') || 
                      sessionStorage.getItem('firebase_auth_token') || 
                      sessionStorage.getItem('authToken');

          console.log('[ServiceWorker Message Listener] Cerere token primită, răspundem cu token:', 
                      token ? `disponibil (${token.length} caractere)` : 'indisponibil');

          // Răspundem cu tokenul doar dacă avem o sursă validă
          if (event.source && 'postMessage' in event.source) {
            (event.source as ServiceWorker).postMessage({ 
              type: 'AUTH_TOKEN_RESPONSE', 
              token: token, 
              timestamp: new Date().toISOString()
            });

            // Confirmăm în console că am trimis răspunsul
            console.log('[ServiceWorker Message Listener] Răspuns token trimis către Service Worker');
          } else {
            console.warn('[ServiceWorker Message Listener] Nu se poate răspunde la cererea de token, source invalid');
          }
        } catch (error) {
          console.error('[ServiceWorker Message Listener] Eroare la procesarea cererii de token:', error);
        }
      } else if (event.data && event.data.type === 'BACKGROUND_CHECK_STATUS') {
        // Actualizăm starea verificării în fundal
        console.log('[ServiceWorker Message Listener] Actualizare stare verificare fundal:', event.data.isActive);
        NotificationHelper.backgroundCheckActive = event.data.isActive;
      }
    });
  }
}

// Exportăm clasa pentru a putea fi folosită în alte componente
export default NotificationHelper;