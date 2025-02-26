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

  constructor() {
    // Initialize only after DOM is fully loaded and HMR is ready
    if (typeof window !== 'undefined') {
      const waitForHMR = () => {
        setTimeout(() => {
          if (document.readyState === 'complete') {
            this.initialize();
          } else {
            window.addEventListener('load', () => {
              setTimeout(() => this.initialize(), 2000);
            });
          }
        }, 100);
      };
      waitForHMR();
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
  }

  private getWebSocketUrl(): string {
    const host = window.location.host;
    console.log('Current window.location.host:', host);
    console.log('Current window.location.protocol:', window.location.protocol);

    if (!host) {
      throw new Error('Window location host is not available');
    }

    const isSecure = window.location.protocol === 'https:';
    const protocol = isSecure ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}/api/ws`;

    console.log('Constructed WebSocket URL:', wsUrl);
    return wsUrl;
  }

  private connect() {
    if (this.ws) {
      this.cleanup();
    }

    try {
      if (!window.location.host) {
        console.log('Host not available, will retry in 1 second');
        setTimeout(() => this.connect(), 1000);
        return;
      }

      const wsUrl = this.getWebSocketUrl();
      console.log('Attempting WebSocket connection to:', wsUrl);

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
        if (this.connectionReject) {
          this.connectionReject(new Error('WebSocket connection failed'));
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log(`WebSocket connection closed (code: ${event.code}, reason: ${event.reason})`);
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
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempt - 1);
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempt}/${this.maxReconnectAttempts} in ${delay}ms`);

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }

      this.reconnectTimeout = setTimeout(() => {
        console.log(`Attempting reconnect ${this.reconnectAttempt}/${this.maxReconnectAttempts}`);
        this.connect();
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
    // If not initialized, initialize and wait for connection
    if (!this.isInitialized) {
      // Add additional delay to ensure Vite's HMR is ready
      await new Promise(resolve => setTimeout(resolve, 1000));
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