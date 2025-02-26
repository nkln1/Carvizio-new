class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<(data: any) => void> = new Set();

  private getWebSocketUrl(): string {
    // Ensure VITE_REPL_URL is available
    if (typeof import.meta === 'undefined' || !import.meta.env || !import.meta.env.VITE_REPL_URL) {
      console.error('VITE_REPL_URL is not available');
      return '';
    }

    const url = new URL(import.meta.env.VITE_REPL_URL);
    return `wss://${url.host}/ws`;
  }

  public async ensureConnection(): Promise<void> {
    // If we already have an open connection, use it
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    // If we have a connection in progress, close it
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    return new Promise((resolve, reject) => {
      const wsUrl = this.getWebSocketUrl();
      if (!wsUrl) {
        return reject(new Error('Could not construct WebSocket URL'));
      }

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          resolve();
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
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.ws = null;
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  public addMessageHandler(handler: (data: any) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
  }
}

const websocketService = new WebSocketService();
export default websocketService;