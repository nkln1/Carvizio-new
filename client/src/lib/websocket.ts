/**
 * WebSocket connection utility for real-time communication
 */

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 5000;

export const setupWebSocket = () => {
  if (socket?.readyState === WebSocket.OPEN) {
    return socket;
  }

  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:5000';
    const wsUrl = `${protocol}//${host}/ws`;

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connection established');
      reconnectAttempts = 0; // Reset attempts on successful connection
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
        reconnectAttempts++;
        setTimeout(setupWebSocket, RECONNECT_INTERVAL);
      } else {
        console.log('Max reconnection attempts reached');
        socket = null;
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return socket;
  } catch (error) {
    console.error('Error setting up WebSocket:', error);
    return null;
  }
};

export const getWebSocket = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return setupWebSocket();
  }
  return socket;
};

export const closeWebSocket = () => {
  if (socket) {
    socket.close();
    socket = null;
    reconnectAttempts = 0;
  }
};