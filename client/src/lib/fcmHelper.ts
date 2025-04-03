// Helper pentru Firebase Cloud Messaging
import { requestFCMPermissionAndToken, setupFCMForegroundListener } from "@/lib/firebase";

// Clasa pentru gestionarea notificărilor FCM
class FCMHelper {
  private static instance: FCMHelper;
  private fcmToken: string | null = null;
  private userId: number | null = null;
  private userRole: 'client' | 'service' | null = null;
  private notificationsEnabled: boolean = false;
  private cleanupListener: (() => void) | null = null;

  private constructor() {
    // Constructor privat pentru Singleton
  }

  public static getInstance(): FCMHelper {
    if (!FCMHelper.instance) {
      FCMHelper.instance = new FCMHelper();
    }
    return FCMHelper.instance;
  }

  // Inițializează FCM pentru un utilizator
  public async initialize(userId: number, userRole: 'client' | 'service'): Promise<boolean> {
    this.userId = userId;
    this.userRole = userRole;

    // Solicită permisiunea și obține tokenul FCM
    try {
      const token = await requestFCMPermissionAndToken();
      if (token) {
        this.fcmToken = token;
        await this.registerTokenWithServer(token);
        this.setupForegroundListener();
        this.notificationsEnabled = true;
        console.log("FCM inițializat cu succes pentru utilizatorul", userId);
        return true;
      } else {
        console.warn("Nu s-a putut obține token FCM");
        return false;
      }
    } catch (error) {
      console.error("Eroare la inițializarea FCM:", error);
      return false;
    }
  }

  // Înregistrează tokenul la server
  private async registerTokenWithServer(token: string): Promise<void> {
    if (!this.userId || !this.userRole) {
      console.error("Nu se poate înregistra tokenul FCM fără date despre utilizator");
      return;
    }

    try {
      // Încercăm prima dată endpoint-ul standard
      let response = await fetch('/api/fcm/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          userRole: this.userRole,
          fcmToken: token
        })
      });

      // Dacă primul endpoint nu merge, încercăm endpoint-ul alternativ
      if (!response.ok) {
        console.warn("Endpoint-ul standard nu funcționează, încercăm alternativa");
        response = await fetch('/api/notifications/register-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: token,
            userId: this.userId,
            userRole: this.userRole
          })
        });
      }

      if (!response.ok) {
        throw new Error(`Eroare la înregistrarea tokenului: ${response.status}`);
      }

      console.log("Token FCM înregistrat cu succes pe server");
      
      // Pornim verificarea mesajelor în fundal dacă funcția este disponibilă
      if (window.startBackgroundMessageCheck) {
        window.startBackgroundMessageCheck({
          userId: this.userId,
          userRole: this.userRole,
          token: token,
          interval: 30000 // Verifică la fiecare 30 secunde
        }).then(result => {
          console.log("Verificare mesaje în fundal pornită:", result);
        }).catch(err => {
          console.error("Eroare la pornirea verificării mesajelor în fundal:", err);
        });
      }
    } catch (error) {
      console.error("Eroare la înregistrarea tokenului FCM pe server:", error);
    }
  }

  // Configurează handler-ul pentru notificări în prim-plan
  private setupForegroundListener() {
    // Curățăm listener-ul existent dacă există
    if (this.cleanupListener) {
      this.cleanupListener();
    }

    // Configurăm listener-ul pentru notificări în prim-plan
    this.cleanupListener = setupFCMForegroundListener((payload) => {
      console.log("Notificare primită în prim-plan:", payload);
      
      // Verificăm dacă avem notificare standard
      if (payload.notification) {
        // Afișăm notificarea folosind API-ul Notification
        this.showNotification(
          payload.notification.title || "Notificare nouă",
          payload.notification.body || "Aveți o notificare nouă",
          payload.data
        );
      } else if (payload.data) {
        // Avem doar date custom, le folosim pentru notificare
        this.showNotification(
          payload.data.title || "Notificare nouă",
          payload.data.body || "Aveți o notificare nouă",
          payload.data
        );
      }
    });
  }

  // Afișează o notificare folosind API-ul Notification
  private showNotification(title: string, body: string, data: any = {}) {
    if (Notification.permission !== 'granted') {
      console.warn("Nu se poate afișa notificare - permisiune negrantată");
      return;
    }

    try {
      // Pregătim opțiunile pentru notificare
      const options: NotificationOptions = {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.tag || 'default',
        data: {
          url: data.url || '/',
          ...data
        },
        requireInteraction: true
      };

      // Adăugăm sunet dacă avem URL
      if (data.soundUrl) {
        try {
          const audio = new Audio(data.soundUrl);
          audio.play().catch(e => console.warn("Eroare la redarea sunetului:", e));
        } catch (e) {
          console.warn("Eroare la inițializarea sunetului:", e);
        }
      }

      // Afișăm notificarea
      const notification = new Notification(title, options);

      // Handler pentru click pe notificare
      notification.onclick = () => {
        // Închide notificarea
        notification.close();
        
        // Deschide URL-ul din notificare
        const url = notification.data?.url || '/';
        window.open(url, '_blank');
        window.focus();
      };
    } catch (error) {
      console.error("Eroare la afișarea notificării:", error);
    }
  }

  // Returnează statusul notificărilor
  public isEnabled(): boolean {
    return this.notificationsEnabled;
  }

  // Oprește și curăță FCM
  public cleanup() {
    if (this.cleanupListener) {
      this.cleanupListener();
      this.cleanupListener = null;
    }
    this.fcmToken = null;
    this.userId = null;
    this.userRole = null;
    this.notificationsEnabled = false;
    console.log("FCM oprit și curățat");
  }
}

// Exportăm instanța singleton
export default FCMHelper.getInstance();