import { WebSocketMessage } from '@/types/websocket';

let socket: WebSocket | null = null;
let reconnectAttempt = 0;
let reconnectTimer: number | null = null;
const maxReconnectAttempts = 10; // Increased from 5
const baseReconnectDelay = 3000; // 3 seconds
const messageHandlers: Array<(data: any) => void> = [];
let isConnecting = false;
let wsUrl = '';

/**
 * Initialize WebSocket connection
 */
const initialize = () => {
  console.log('Initializing WebSocket service...');

  // Determine WebSocket URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  wsUrl = `${protocol}//${host}/api/ws`;

  console.log('WebSocket URL:', wsUrl);

  // Create connection
  if (!isConnecting && !socket) {
    connect(wsUrl);
  }
};

/**
 * Connect to WebSocket server
 */
const connect = (url: string) => {
  try {
    if (isConnecting) return; // Prevent multiple connection attempts
    isConnecting = true;

    // Clear any existing reconnect timer
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    console.log('Connecting to WebSocket:', url);
    socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('WebSocket connection established');
      isConnecting = false;
      // Reset reconnect attempt counter on successful connection
      reconnectAttempt = 0;
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);

        // Notify all handlers
        messageHandlers.forEach(handler => handler(data));
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      isConnecting = false;
      // Don't try to reconnect on error, let onclose handle it
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      socket = null;
      isConnecting = false;

      // Attempt to reconnect
      if (reconnectAttempt < maxReconnectAttempts) {
        reconnectAttempt++;
        const delay = baseReconnectDelay * Math.pow(1.5, reconnectAttempt - 1);
        console.log(`Reconnecting attempt ${reconnectAttempt} in ${delay}ms`);

        reconnectTimer = window.setTimeout(() => {
          connect(url);
        }, delay);
      } else {
        console.log('Maximum reconnection attempts reached. Giving up.');
      }
    };
  } catch (error) {
    console.error('Error connecting to WebSocket:', error);
    isConnecting = false;
  }
};


export const websocketService = {
  initialize,
  addMessageHandler: (handler: (data: any) => void) => {
    messageHandlers.push(handler);
    return () => {
      messageHandlers.splice(messageHandlers.indexOf(handler), 1);
    };
  },
  disconnect: () => {
    if (socket) {
      socket.close();
      socket = null;
    }
    messageHandlers.length = 0;
    reconnectAttempt = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    isConnecting = false;

  }
};