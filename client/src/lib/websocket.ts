// Declare Firebase type
declare global {
  interface Window {
    firebase?: {
      auth: () => {
        currentUser: any;
      };
    };
  }
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private readonly maxReconnectAttempts = 20;
  private readonly reconnectDelay = 3000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Set<(data: any) => void> = new Set();
  private isInitialized = false;
  private connectionPromise: Promise<void> | null = null;
  private connectionResolve: (() => void) | null = null;
  private connectionReject: ((error: Error) => void) | null = null;
  private isPollingFallback = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastMessageTimestamp: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Verificăm mai întâi dacă document este disponibil
      if (typeof document !== 'undefined') {
        if (document.readyState === 'complete') {
          this.initialize();
        } else {
          window.addEventListener('load', () => this.initialize());
        }
      } else {
        // Dacă documentul nu e disponibil, amânăm inițializarea
        setTimeout(() => this.initialize(), 100);
      }
    }
  }

  private initialize() {
    if (this.isInitialized) return;

    console.log('Initializing WebSocket service...');
    this.isInitialized = true;

    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionResolve = resolve;
      this.connectionReject = reject;
      this.connect();
    });

    // Add catch handler to prevent unhandled promise rejection
    this.connectionPromise.catch(error => {
      console.log('WebSocket connection promise rejected, will use polling fallback:', error);
      this.startPollingFallback();
    });

    window.addEventListener('online', () => {
      console.log('Network connection restored, reconnecting WebSocket...');
      this.reconnectAttempt = 0;
      this.connect();
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      this.cleanup();
    });
  }

  private getWebSocketUrl(): string {
    // Try to detect if we're in a development environment
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname.includes('replit.dev');

    // Updated path to match server configuration
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/socket`;  // Must match the path in server's WebSocketServer config
    
    // Verificăm dacă adresa de websocket este permisă (pentru debugging)
    console.log('[WebSocket] Permisă conexiunea către:', wsUrl);
    
    if (isDev) {
      console.log('WebSocket URL (dev environment):', wsUrl);
    } else {
      console.log('WebSocket URL (production):', wsUrl);
    }
    
    return wsUrl;
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.CONNECTING) {
      console.log('Connection attempt already in progress');
      return;
    }

    this.cleanup();

    try {
      const wsUrl = this.getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      // Add timeout for connection attempt
      const connectionTimeout = setTimeout(() => {
        console.log('WebSocket connection attempt timed out');
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
          if (this.connectionReject) {
            this.connectionReject(new Error('WebSocket connection timeout'));
          }
          this.scheduleReconnect();
        }
      }, 10000); // 10 second timeout

      this.ws.onopen = () => {
        console.log('WebSocket connection established successfully');
        clearTimeout(connectionTimeout);
        this.reconnectAttempt = 0;

        // Stop polling if it's active
        if (this.isPollingFallback) {
          this.stopPollingFallback();
          this.isPollingFallback = false;
        }

        if (this.connectionResolve) {
          this.connectionResolve();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          console.log('Raw WebSocket message received:', event.data);
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message (parsed):', data);

          // Update last message timestamp for polling fallback
          if (data && data.timestamp) {
            this.lastMessageTimestamp = data.timestamp;
          }

          // Verificăm dacă mesajul are un tip valid
          if (data && data.type) {
            // Generăm un ID unic pentru mesaj dacă nu există deja
            if (!data.notificationId) {
              data.notificationId = `websocket-${data.type}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            }
            
            // Folosim același mecanism de prevenire a duplicatelor ca în NotificationHelper
            const sharedProcessedIds = this.processedMessageIds;
            
            // Verificăm dacă acest mesaj a fost deja procesat pentru a evita duplicatele
            if (sharedProcessedIds.has(data.notificationId)) {
              console.log(`WebSocket: Mesaj ignorat (duplicat) cu ID: ${data.notificationId}`);
              return;
            }
            
            // Marcăm mesajul ca procesat
            sharedProcessedIds.add(data.notificationId);
            
            // Limităm mărimea setului pentru a evita consumul excesiv de memorie
            if (sharedProcessedIds.size > 100) {
              // Eliminăm primele 50 de elemente când depășim 100
              const idsToRemove = Array.from(sharedProcessedIds).slice(0, 50);
              idsToRemove.forEach(id => sharedProcessedIds.delete(id));
            }
            
            // Adăugăm debug suplimentar pentru mesajele de tip NEW_MESSAGE
            if (data.type === 'NEW_MESSAGE') {
              console.log('Received NEW_MESSAGE event:', data);
              console.log('NEW_MESSAGE content:', data.payload?.content);

              // Emitem un eveniment DOM pentru a facilita depanarea
              const newMessageEvent = new CustomEvent('new-message-received', { 
                detail: data 
              });
              window.dispatchEvent(newMessageEvent);
            }

            // Notificăm toți handlerii înregistrați
            this.messageHandlers.forEach(handler => {
              try {
                handler(data);
              } catch (handlerError) {
                console.error('Error in message handler:', handlerError);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          console.log('Raw message that caused error:', event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        clearTimeout(connectionTimeout);
        if (this.connectionReject && this.reconnectAttempt === 0) {
          this.connectionReject(new Error('WebSocket connection failed'));
        }
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket connection closed with code ${event.code} and reason: ${event.reason}`);
        clearTimeout(connectionTimeout);
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempt < this.maxReconnectAttempts) {
      this.reconnectAttempt++;

      // Use shorter backoff times to prevent long waits
      const delay = Math.min(
        this.reconnectDelay * Math.min(2, this.reconnectAttempt),
        30000 // Max 30 seconds between attempts
      );

      console.log(`Reconnecting attempt ${this.reconnectAttempt} in ${delay}ms`);

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }

      this.reconnectTimeout = setTimeout(() => this.connect(), delay);

      // After a few failed attempts, start polling as fallback
      if (this.reconnectAttempt >= 3 && !this.isPollingFallback) {
        console.log('Starting polling fallback after multiple WebSocket failures');
        this.startPollingFallback();
      }
    } else {
      console.log('Max reconnection attempts reached, switching to polling fallback');
      if (!this.isPollingFallback) {
        this.startPollingFallback();
      }
    }
  }

  private cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      // Only close if not already closed
      if (this.ws.readyState !== WebSocket.CLOSED && this.ws.readyState !== WebSocket.CLOSING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  // Polling fallback mechanism for environments where WebSockets don't work
  private startPollingFallback() {
    if (this.isPollingFallback) return;

    console.log('Starting polling fallback for message updates');
    this.isPollingFallback = true;

    // Poll every 30 seconds for new messages (increaseăm intervalul din 10 la 30 secunde)
    this.pollingFallback();
    this.pollingInterval = setInterval(() => this.pollingFallback(), 30000);
  }

  private stopPollingFallback() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPollingFallback = false;
    console.log('Stopped polling fallback as WebSocket is now connected');
  }

  // Set pentru a ține evidența ID-urilor mesajelor procesate (partajat cu NotificationHelper)
  private get processedMessageIds(): Set<string> {
    return this.getNotificationHelper().processedNotificationIds;
  }
  
  // Metodă pentru a obține instanța NotificationHelper
  private getNotificationHelper() {
    // Se asigură că modulul este disponibil și inițializat
    if (!window.NotificationHelper) {
      // Încarcă lazy modulul dacă nu există
      import('./notifications').then(module => {
        window.NotificationHelper = module.default;
      }).catch(err => {
        console.error('Eroare la încărcarea NotificationHelper:', err);
      });
      
      // Returnează un set gol temporar dacă NotificationHelper nu este disponibil
      // (va fi sincronizat la următoarea apelare)
      return { processedNotificationIds: new Set<string>() };
    }
    
    return window.NotificationHelper;
  }
  
  private async pollingFallback() {
    try {
      console.log('Polling for new messages...');
      // Get authentication token if available
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.log('No authentication token available for polling');
        return;
      }

      const params = new URLSearchParams();
      if (this.lastMessageTimestamp) {
        params.append('since', this.lastMessageTimestamp);
      }

      const response = await fetch(`/api/messages/poll?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to poll for messages:', response.status);
        return;
      }

      const messages = await response.json();
      console.log('Polled messages:', messages);

      if (messages && messages.length > 0) {
        // Update last timestamp
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.timestamp) {
          this.lastMessageTimestamp = lastMessage.timestamp;
        }

        // Process messages as if they came from WebSocket
        messages.forEach((message: any) => {
          // Verificăm dacă este un mesaj nou
          if (message && message.type) {
            // Adăugăm ID unic pentru evitarea duplicatelor dacă nu există deja
            if (!message.notificationId) {
              message.notificationId = `polling-${message.type}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            }
            
            // Folosim același mecanism de prevenire a duplicatelor ca în NotificationHelper
            const sharedProcessedIds = this.processedMessageIds;
            
            // Verificăm dacă acest mesaj a fost deja procesat pentru a evita duplicatele
            if (sharedProcessedIds.has(message.notificationId)) {
              console.log(`Polling: Mesaj ignorat (duplicat) cu ID: ${message.notificationId}`);
              return;
            }
            
            // Marcăm mesajul ca procesat
            sharedProcessedIds.add(message.notificationId);
            
            // Limităm mărimea setului pentru a evita consumul excesiv de memorie
            if (sharedProcessedIds.size > 100) {
              // Eliminăm primele 50 de elemente când depășim 100
              const idsToRemove = Array.from(sharedProcessedIds).slice(0, 50);
              idsToRemove.forEach(id => sharedProcessedIds.delete(id));
            }
            
            if (message.type === 'NEW_MESSAGE') {
              console.log('Received NEW_MESSAGE from polling:', message);
            }
            
            // Transmitem mesajul la toți handlerii înregistrați
            this.messageHandlers.forEach(handler => {
              try {
                handler(message);
              } catch (handlerError) {
                console.error('Error in message handler during polling:', handlerError);
              }
            });
          }
        });
      }
    } catch (error) {
      console.error('Error during message polling:', error);
    }
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      // Check if Firebase auth is available
      if (typeof window !== 'undefined' && window.firebase && window.firebase.auth) {
        const user = window.firebase.auth().currentUser;
        if (user) {
          return await user.getIdToken();
        }
      }

      // Try to find token in localStorage as fallback
      if (typeof localStorage !== 'undefined') {
        const token = localStorage.getItem('authToken');
        if (token) return token;
      }

      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  public async ensureConnection(): Promise<void> {
    if (!this.isInitialized) {
      this.initialize();
    }

    try {
      await (this.connectionPromise || Promise.resolve());
      return Promise.resolve();
    } catch (error) {
      console.log('Using polling fallback after WebSocket connection failure');
      if (!this.isPollingFallback) {
        this.startPollingFallback();
      }
      return Promise.resolve(); // Still resolve to not block app functionality
    }
  }

  public addMessageHandler(handler: (data: any) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public disconnect() {
    console.log('Disconnecting WebSocket service');
    this.cleanup();

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.messageHandlers.clear();
    this.isInitialized = false;
    this.connectionPromise = null;
    this.connectionResolve = null;
    this.connectionReject = null;
    this.isPollingFallback = false;
  }

  // For testing and debugging
  public testConnection() {
    this.reconnectAttempt = 0;
    this.cleanup();
    return this.connect();
  }

  public getConnectionStatus() {
    if (!this.ws) return 'disconnected';

    switch(this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }

  public isPollingActive() {
    return this.isPollingFallback;
  }
}

const websocketService = new WebSocketService();
export default websocketService;