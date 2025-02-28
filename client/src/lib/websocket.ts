class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 3000; // 3 seconds
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Set<(data: any) => void> = new Set();
  private isInitialized = false;
  private connectionPromise: Promise<void> | null = null;
  private connectionResolve: (() => void) | null = null;
  private connectionReject: ((error: Error) => void) | null = null;
  private isReconnecting = false;

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

    // Add page visibility change handler
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, checking WebSocket connection...');
        this.checkConnection();
      }
    });

    // Add online/offline handlers
    window.addEventListener('online', () => {
      console.log('Network connection restored, reconnecting WebSocket...');
      this.checkConnection();
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      this.cleanup();
    });
  }

  private checkConnection() {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      console.log('WebSocket connection needs to be restored');
      this.reconnectAttempt = 0;
      this.connect();
    }
  }

  private getWebSocketUrl(): string {
    if (typeof window === 'undefined' || !window.location) {
      console.error('Window location not available');
      return '';
    }

    const isSecure = window.location.protocol === 'https:';
    const protocol = isSecure ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    console.log('Constructed WebSocket URL:', wsUrl);
    return wsUrl;
  }

  private connect() {
    if (this.isReconnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('Connection attempt already in progress');
      return;
    }

    if (typeof window === 'undefined' || !window.location) {
      console.log('Window not available, delaying connection...');
      setTimeout(() => this.connect(), 1000);
      return;
    }

    this.cleanup();

    try {
      const wsUrl = this.getWebSocketUrl();
      if (!wsUrl) {
        throw new Error('Failed to construct WebSocket URL');
      }

      console.log('Attempting WebSocket connection to:', wsUrl);
      this.ws = new WebSocket(wsUrl);
      this.isReconnecting = true;

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket connection timeout');
          this.ws.close();
        }
      }, 10000);

      this.ws.onopen = () => {
        console.log('WebSocket connection established');
        clearTimeout(connectionTimeout);
        this.reconnectAttempt = 0;
        this.isReconnecting = false;
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
        clearTimeout(connectionTimeout);
        this.isReconnecting = false;
        if (this.connectionReject && this.reconnectAttempt === 0) {
          this.connectionReject(new Error('WebSocket connection failed'));
        }
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket connection closed (code: ${event.code}, reason: ${event.reason})`);
        clearTimeout(connectionTimeout);
        this.isReconnecting = false;
        if (this.ws) {
          this.ws = null;
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.isReconnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempt < this.maxReconnectAttempts) {
      this.reconnectAttempt++;
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempt - 1);
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempt}/${this.maxReconnectAttempts} in ${delay}ms`);

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }

      this.reconnectTimeout = setTimeout(() => {
        console.log(`Attempting reconnect ${this.reconnectAttempt}/${this.maxReconnectAttempts}`);
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
          this.connect();
        }
      }, delay);
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
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
    this.isReconnecting = false;
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
    console.log('Disconnecting WebSocket service...');
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