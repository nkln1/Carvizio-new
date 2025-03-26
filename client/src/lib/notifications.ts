
/**
 * Helper pentru gestionarea notificărilor browser
 */
class NotificationHelper {
  private static debugMode = true;

  /**
   * Verifică dacă API-ul de notificări este suportat de browser
   */
  static isSupported(): boolean {
    const supported = 'Notification' in window;
    if (this.debugMode) console.log('Notificări browser suportate:', supported);
    return supported;
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
  static showNotification(title: string, options: NotificationOptions = {}): Notification | null {
    if (!this.isSupported()) {
      console.error('Notificările nu sunt disponibile în acest browser');
      return null;
    }
    
    if (Notification.permission !== 'granted') {
      console.error('Permisiune pentru notificări neacordată, permisiune curentă:', Notification.permission);
      return null;
    }

    try {
      console.log('Afișare notificare:', title, options);
      
      // Opțiuni implicite pentru notificări
      const defaultOptions: NotificationOptions = {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        silent: false,
        requireInteraction: true,  // Notificarea rămâne vizibilă până când utilizatorul interacționează cu ea
        ...options
      };

      // Creăm și afișăm notificarea
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

      return notification;
    } catch (error) {
      console.error('Eroare la afișarea notificării:', error);
      return null;
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
   * Metoda pentru gestionarea evenimentelor de notificare
   * @param data Datele evenimentului pentru afișarea notificării
   */
  static handleNotificationEvent(data: any): void {
    console.log('Procesare eveniment notificare:', data);
    
    if (!data || !data.type) {
      console.warn('Date de notificare invalide:', data);
      return;
    }
    
    // Verificăm tipul de eveniment
    switch (data.type) {
      case 'NEW_MESSAGE':
        this.showNotification('Mesaj nou', {
          body: data.payload?.content || 'Ați primit un mesaj nou',
          icon: '/favicon.ico',
          tag: `message-${Date.now()}` // Tag unic pentru fiecare mesaj
        });
        break;
      case 'NEW_OFFER':
        this.showNotification('Ofertă nouă', {
          body: data.payload?.title || 'Ați primit o ofertă nouă',
          icon: '/favicon.ico'
        });
        break;
      case 'NEW_REQUEST':
        this.showNotification('Cerere nouă', {
          body: data.payload?.title || 'Ați primit o cerere nouă',
          icon: '/favicon.ico'
        });
        break;
      case 'OFFER_STATUS_CHANGED':
        if (data.payload?.status === 'Accepted') {
          this.showNotification('Ofertă acceptată', {
            body: 'O ofertă trimisă de dvs. a fost acceptată',
            icon: '/favicon.ico'
          });
        }
        break;
      default:
        console.log('Tip de eveniment necunoscut pentru notificare:', data.type);
    }
  }
}

export default NotificationHelper;
