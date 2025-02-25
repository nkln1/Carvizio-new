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
      // Add a small delay to ensure Vite's HMR WebSocket is initialized first
      setTimeout(() => {
        if (document.readyState === 'complete') {
          this.initialize();
        } else {
          window.addEventListener('load', () => this.initialize());
        }
      }, 1000);
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

  private getWebSocketUrl(): string | null {
    try {
      if (!window.location.host) {
        console.log('Host not available yet, will retry');
        return null;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/ws`;

      console.log('Constructed WebSocket URL:', wsUrl);
      return wsUrl;
    } catch (error) {
      console.error('Error constructing WebSocket URL:', error);
      return null;
    }
  }

  private connect() {
    this.cleanup();

    try {
      const wsUrl = this.getWebSocketUrl();
      if (!wsUrl) {
        console.log('WebSocket URL not ready, retrying in 1 second...');
        setTimeout(() => this.connect(), 1000);
        return;
      }

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
    if (!this.connectionPromise) {
      this.initialize();
    }
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