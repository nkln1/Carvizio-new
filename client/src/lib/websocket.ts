class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 3000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Set<(data: any) => void> = new Set();
  private isInitialized = false;
  private connectionPromise: Promise<void> | null = null;
  private connectionResolve: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Wait for the document to be fully loaded
      if (document.readyState === 'complete') {
        this.initialize();
      } else {
        window.addEventListener('load', () => this.initialize());
      }
    }
  }

  private initialize() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.connectionPromise = new Promise((resolve) => {
        this.connectionResolve = resolve;
        this.connect();
      });
    }
  }

  private connect() {
    this.cleanup();

    try {
      // Wait for window.location to be properly initialized
      if (!window.location.host) {
        setTimeout(() => this.connect(), 100);
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/ws`;

      console.log('Connecting to WebSocket:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connection established');
        this.reconnectAttempt = 0;
        if (this.connectionResolve) {
          this.connectionResolve();
          this.connectionResolve = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandlers.forEach(handler => handler(data));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket connection closed (code: ${event.code})`);
        if (this.ws) {
          this.ws = null;
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempt < this.maxReconnectAttempts) {
      this.reconnectAttempt++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempt - 1);
      console.log(`Attempting to reconnect (${this.reconnectAttempt}/${this.maxReconnectAttempts}) in ${delay}ms...`);

      this.reconnectTimeout = setTimeout(() => {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
          this.connect();
        }
      }, delay);
    } else {
      console.log('Max reconnection attempts reached');
      this.messageHandlers.forEach(handler =>
        handler({ type: 'ERROR', message: 'Connection lost. Please refresh the page.' })
      );
    }
  }

  private cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  public async ensureConnection(): Promise<void> {
    return this.connectionPromise || Promise.resolve();
  }

  public addMessageHandler(handler: (data: any) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public disconnect() {
    this.cleanup();
    this.messageHandlers.clear();
    this.isInitialized = false;
    this.connectionPromise = null;
    this.connectionResolve = null;
  }
}

const websocketService = new WebSocketService();
export default websocketService;