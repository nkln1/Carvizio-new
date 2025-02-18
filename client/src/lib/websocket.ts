/**
 * WebSocket connection utility for real-time communication
 */

let socket: WebSocket | null = null;

export const setupWebSocket = () => {
  if (socket) {
    return socket;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('WebSocket connection established');
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
    socket = null;
    // Attempt to reconnect after 5 seconds
    setTimeout(setupWebSocket, 5000);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return socket;
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
  }
};
