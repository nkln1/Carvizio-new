// client/src/lib/websocket.ts
import { auth } from "./firebase";
let isConnected = false; 
let websocket: WebSocket | null = null;
let messageHandlers: ((data: any) => void)[] = [];
let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
let hasActiveConnection = false;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000; // 3 seconds

/**
 * Initializes WebSocket service
 */
function initialize() {
  console.log('Initializing WebSocket service...');
  connect();
}

/**
 * Ensures a WebSocket connection exists
 * Returns a Promise that resolves when the connection is established
 */
function ensureConnection(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    // If connection is in progress
    if (websocket && websocket.readyState === WebSocket.CONNECTING) {
      const checkConnection = () => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          resolve();
        } else if (!websocket || websocket.readyState === WebSocket.CLOSED) {
          reject(new Error('WebSocket connection failed'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      setTimeout(checkConnection, 100);
      return;
    }

    // Need to create a new connection
    connect();

    const checkNewConnection = () => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        resolve();
      } else if (!websocket || websocket.readyState === WebSocket.CLOSED) {
        reject(new Error('WebSocket connection failed'));
      } else {
        setTimeout(checkNewConnection, 100);
      }
    };
    setTimeout(checkNewConnection, 100);
  });
}

/**
 * Creates a WebSocket connection with the server
 */
function connect() {
  try {
    // Close existing connection if any
    if (websocket) {
      websocket.onclose = null; // Prevent reconnection on intentional close
      websocket.close();
    }

    // Determine WebSocket URL
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${loc.host}/api/ws`;
    console.log('WebSocket URL:', wsUrl);

    // Create new WebSocket
    console.log('Connecting to WebSocket:', wsUrl);
    websocket = new WebSocket(wsUrl);
    configureWebSocket(websocket);
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    scheduleReconnect();
  }
}

/**
 * Configure WebSocket event handlers
 */
function configureWebSocket(ws: WebSocket) {
  ws.onopen = () => {
    console.log('WebSocket connection established');
    reconnectAttempts = 0; // Reset reconnect attempt counter on successful connection
    hasActiveConnection = true;
    isConnected = true;

    // Notificăm toți handler-ii despre conectare
    messageHandlers.forEach(handler => {
      try {
        handler({ type: 'CONNECTED', message: 'WebSocket connection established' });
      } catch (error) {
        console.error('Error in connection notification handler:', error);
      }
    });

    // Send authentication information if available
    const user = auth.currentUser;
    if (user) {
      user.getIdToken().then(token => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'AUTH', token }));
        }
      }).catch(error => {
        console.error('Error getting authentication token:', error);
      });
    }
  };

  ws.onclose = (event) => {
    // Evită log excesiv în consolă - doar afișează un mesaj simplu
    if (reconnectAttempts < 3) {
      console.log('WebSocket connection closed, reconnecting...');
    }

    hasActiveConnection = false;
    isConnected = false;

    // Notificăm toți handler-ii despre deconectare
    messageHandlers.forEach(handler => {
      try {
        handler({ type: 'DISCONNECTED', message: 'WebSocket connection closed' });
      } catch (error) {
        console.error('Error in disconnection notification handler:', error);
      }
    });

    scheduleReconnect();
  };

  ws.onerror = (error) => {
    // Evită log excesiv de erori în consolă
    if (reconnectAttempts < 3) {
      console.log('WebSocket connection issue, attempting to reconnect...');
    }
    hasActiveConnection = false;

    // Notificăm handler-ii despre eroare
    messageHandlers.forEach(handler => {
      try {
        handler({ type: 'ERROR', message: 'WebSocket connection error' });
      } catch (err) {
        console.error('Error in error notification handler:', err);
      }
    });
  };
}

/**
 * Schedule a reconnection attempt
 */
function scheduleReconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    // Backoff strategy with maximum wait time
    const delay = Math.min(3000 * Math.pow(1.5, reconnectAttempts), 60000);

    // Afișăm mesaje mai puțin frecvent pentru a reduce zgomotul
    if (reconnectAttempts % 3 === 0 || reconnectAttempts === 0) {
      console.log(`Reconnecting attempt ${reconnectAttempts + 1} in ${Math.round(delay/1000)}s`);
    }

    reconnectTimeout = setTimeout(() => {
      reconnectAttempts++;
      connect();
    }, delay);
  } else {
    console.error('Maximum WebSocket reconnection attempts reached');
  }
}

/**
 * Register a handler for incoming messages
 */
function addMessageHandler(handler: (data: any) => void) {
  messageHandlers.push(handler);
}

/**
 * Remove a message handler
 */
function removeMessageHandler(handler: (data: any) => void) {
  const index = messageHandlers.indexOf(handler);
  if (index !== -1) {
    messageHandlers.splice(index, 1);
  }
}

/**
 * Send a message through the WebSocket
 */
function sendMessage(message: any): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      ensureConnection()
        .then(() => {
          if (websocket) {
            websocket.send(JSON.stringify(message));
            resolve();
          } else {
            reject(new Error('WebSocket not available'));
          }
        })
        .catch(reject);
    } else {
      websocket.send(JSON.stringify(message));
      resolve();
    }
  });
}

/**
 * Check if the WebSocket connection is active
 */
function isConnectionActive(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (hasActiveConnection && websocket && websocket.readyState === WebSocket.OPEN) {
      resolve(true);
    } else {
      // Încercăm să reconectăm dacă nu suntem deja în proces de reconectare
      if (!reconnectTimeout) {
        scheduleReconnect();
      }
      reject(false);
    }
  });
}


// Create websocket service object with all methods
const websocketService = {
  initialize,
  addMessageHandler,
  removeMessageHandler,
  sendMessage,
  ensureConnection,
  isConnectionActive,
};

// Initialize the WebSocket service when this module is imported
initialize();

// Export the websocket service as default
export default websocketService;