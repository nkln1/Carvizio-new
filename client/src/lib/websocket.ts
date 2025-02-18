/**
 * WebSocket connection utility for real-time communication
 */

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 5000;

export const setupWebSocket = () => {
  if (socket?.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
    return socket;
  }

  try {
    // Get the correct protocol based on the current connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use the current host and append the WebSocket path
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log('Connecting to WebSocket:', wsUrl);
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connection established');
      reconnectAttempts = 0; // Reset attempts on successful connection
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed', event.code, event.reason);

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

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
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

export const sendWebSocketMessage = (message: any) => {
  const ws = getWebSocket();
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  } else {
    console.warn('WebSocket is not connected. Message not sent:', message);
  }
};