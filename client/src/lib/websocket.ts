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
  private connectionReject: ((error: Error) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      if (document.readyState === 'complete') {
        this.initialize();
      } else {
        window.addEventListener('load', () => this.initialize());
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
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
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
          const data = JSON.parse(event.data);
          this.messageHandlers.forEach(handler => handler(data));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
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