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
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws`;
      console.log('Connecting to WebSocket:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connection established');
        this.reconnectAttempt = 0;
        if (this.connectionResolve) {
          this.connectionResolve();
          this.connectionResolve = null; //Removed this line from original code as connectionResolve is no longer needed here.
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

      this.ws.onclose = (event) => {
        console.log(`WebSocket connection closed (code: ${event.code})`);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  private cleanup() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempt < this.maxReconnectAttempts) {
      this.reconnectAttempt++;
      console.log(`Attempting to reconnect (${this.reconnectAttempt}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`);
      this.reconnectTimeout = setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      console.log('Max reconnection attempts reached');
      this.messageHandlers.forEach(handler =>
        handler({ type: 'ERROR', message: 'Connection lost. Please refresh the page.' })
      );
    }
  }

  public addMessageHandler(handler: (data: any) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public async waitForConnection(): Promise<void> {
    return this.connectionPromise || Promise.resolve();
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