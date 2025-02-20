class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 3000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Set<(data: any) => void> = new Set();

  constructor() {
    this.connect();
  }

  private connect() {
    this.cleanup();

    try {
      // Get the base URL from the current window location
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      const wsPath = '/ws';
      const wsUrl = `${wsProtocol}//${wsHost}${wsPath}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen() {
    console.log('WebSocket connection established');
    this.reconnectAttempt = 0;
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      this.messageHandlers.forEach(handler => handler(data));
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleError(error: Event) {
    console.error('WebSocket error:', error);
  }

  private handleClose(event: CloseEvent) {
    console.log(`WebSocket connection closed ${event.code}`);
    this.scheduleReconnect();
  }

  private cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempt < this.maxReconnectAttempts) {
      this.reconnectAttempt++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempt - 1);
      console.log(`Attempting to reconnect (${this.reconnectAttempt}/${this.maxReconnectAttempts})...`);

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

  public addMessageHandler(handler: (data: any) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public disconnect() {
    this.cleanup();
    this.messageHandlers.clear();
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();
export default websocketService;