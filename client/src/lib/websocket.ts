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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`; // Corectare cale API/WS
    console.log('WebSocket URL:', wsUrl);
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
      console.log('[WebSocket] Permisă conexiunea către:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connection established');
        this.reconnectAttempt = 0;
        if (this.connectionResolve) {
          this.connectionResolve();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          console.log('Raw WebSocket message received:', event.data);
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message (parsed):', data);
          
          // Verificăm dacă mesajul are un tip valid
          if (data && data.type) {
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
        if (this.connectionReject && this.reconnectAttempt === 0) {
          this.connectionReject(new Error('WebSocket connection failed'));
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
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
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempt - 1);
      console.log(`Reconnecting attempt ${this.reconnectAttempt} in ${delay}ms`);

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }

      this.reconnectTimeout = setTimeout(() => this.connect(), delay);
    } else {
      console.log('Max reconnection attempts reached');
    }
  }

  private cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public async ensureConnection(): Promise<void> {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.connectionPromise || Promise.resolve();
  }

  public addMessageHandler(handler: (data: any) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public disconnect() {
    console.log('Disconnecting WebSocket service');
    this.cleanup();
    this.messageHandlers.clear();
    this.isInitialized = false;
    this.connectionPromise = null;
    this.connectionResolve = null;
    this.connectionReject = null;
  }
}

const websocketService = new WebSocketService();
export default websocketService;