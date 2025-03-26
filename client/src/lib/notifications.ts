
// Utilitar pentru gestionarea notificărilor browser
const NotificationHelper = {
  // Verifică dacă notificările sunt suportate
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  // Verifică permisiunea curentă
  checkPermission(): string {
    if (!this.isSupported()) return 'not-supported';
    return Notification.permission;
  },

  // Solicită permisiunea
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Eroare la solicitarea permisiunii de notificare:', error);
      return false;
    }
  },

  // Afișează o notificare
  showNotification(title: string, options?: NotificationOptions): Notification | null {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      console.warn('Notificările nu sunt permise sau nu sunt suportate');
      return null;
    }

    try {
      return new Notification(title, options);
    } catch (error) {
      console.error('Eroare la afișarea notificării:', error);
      return null;
    }
  },

  // Testează dacă notificările funcționează
  testNotification(): void {
    if (this.checkPermission() === 'granted') {
      this.showNotification('Test Notificare', {
        body: 'Aceasta este o notificare de test',
        icon: '/favicon.ico'
      });
    } else {
      console.warn('Permisiune pentru notificări neacordată');
    }
  }
};

export default NotificationHelper;
