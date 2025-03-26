
/**
 * Helper pentru gestionarea notificărilor browser
 */
class NotificationHelper {
  /**
   * Verifică dacă API-ul de notificări este suportat de browser
   */
  static isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Verifică permisiunea curentă pentru notificări
   * @returns 'granted', 'denied' sau 'default'
   */
  static checkPermission(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
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
      const permission = await Notification.requestPermission();
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
    if (!this.isSupported() || Notification.permission !== 'granted') {
      console.error('Notificările nu sunt disponibile sau permisiunea nu este acordată');
      return null;
    }

    try {
      // Opțiuni implicite pentru notificări
      const defaultOptions: NotificationOptions = {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        silent: false,
        ...options
      };

      // Creăm și afișăm notificarea
      const notification = new Notification(title, defaultOptions);
      
      // Event handlers
      notification.onclick = () => {
        console.log('Notificare accesată');
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
    const permission = this.checkPermission();
    console.log('Testăm notificările. Permisiune curentă:', permission);
    
    if (permission === 'granted') {
      this.showNotification('Notificare de test', {
        body: 'Aceasta este o notificare de test. Dacă vedeți acest mesaj, notificările în browser funcționează corect.',
        icon: '/favicon.ico',
        tag: 'test-notification'
      });
    } else {
      console.warn('Nu se poate testa notificarea - permisiunea nu este acordată');
      // Încercăm să solicităm permisiunea dacă nu este denial
      if (permission !== 'denied') {
        this.requestPermission().then(granted => {
          if (granted) {
            this.testNotification();
          }
        });
      }
    }
  }
}

export default NotificationHelper;
