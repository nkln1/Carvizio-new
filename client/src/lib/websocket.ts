
// client/src/lib/websocket.ts
import { v4 as uuidv4 } from 'uuid';

// Configurare WebSocket
const RECONNECT_DELAY_MIN = 1000; // 1 secunde
const RECONNECT_DELAY_MAX = 30000; // 30 secunde
const MESSAGE_TIMEOUT = 15000; // 15 secunde

// Variabile modul
let websocket: WebSocket | null = null;
let reconnectAttempt = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
let lastPingTime = 0;
let pingInterval: NodeJS.Timeout | null = null;
let isReconnecting = false;
let messageHandlers: ((data: any) => void)[] = [];
let connectionStatusListeners: ((status: boolean) => void)[] = [];

// Stocăm temporar mesajele dacă conexiunea nu este stabilită încă
const messageQueue: {id: string, data: any, timeout: NodeJS.Timeout}[] = [];

/**
 * Serviciu WebSocket pentru comunicarea în timp real
 */
const websocketService = {
  /**
   * Inițializează serviciul WebSocket și stabilește o conexiune
   */
  initialize: () => {
    initializeWebSocketService();
  },

  /**
   * Adaugă un handler pentru procesarea mesajelor primite
   * @param handler Funcția care va procesa mesajele
   */
  addMessageHandler: (handler: (data: any) => void) => {
    if (typeof handler !== 'function') {
      console.error('Handlerul pentru mesaje trebuie să fie o funcție');
      return;
    }
    messageHandlers.push(handler);
  },

  /**
   * Adaugă un listener pentru starea conexiunii
   * @param listener Funcția care va fi apelată la schimbarea stării conexiunii
   */
  addConnectionStatusListener: (listener: (status: boolean) => void) => {
    if (typeof listener !== 'function') {
      console.error('Listener-ul pentru starea conexiunii trebuie să fie o funcție');
      return;
    }
    connectionStatusListeners.push(listener);
    
    // Notificăm imediat starea curentă
    isConnected().then(status => {
      listener(status);
    });
  },

  /**
   * Elimină un listener pentru starea conexiunii
   * @param listener Funcția care a fost anterior înregistrată
   */
  removeConnectionStatusListener: (listener: (status: boolean) => void) => {
    const index = connectionStatusListeners.indexOf(listener);
    if (index !== -1) {
      connectionStatusListeners.splice(index, 1);
    }
  },

  /**
   * Trimite un mesaj către server
   * @param data Datele care vor fi trimise
   * @returns Promisiune care se rezolvă când mesajul este trimis sau respins în caz de eroare
   */
  sendMessage: (data: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Generăm un ID unic pentru acest mesaj
      const messageId = uuidv4();
      
      // Creăm un timeout pentru mesaj
      const timeoutId = setTimeout(() => {
        // Găsim și eliminăm mesajul din coadă
        const index = messageQueue.findIndex(msg => msg.id === messageId);
        if (index !== -1) {
          messageQueue.splice(index, 1);
        }
        reject(new Error('Timeout la trimiterea mesajului'));
      }, MESSAGE_TIMEOUT);
      
      // Adăugăm mesajul în coadă
      messageQueue.push({
        id: messageId,
        data,
        timeout: timeoutId
      });
      
      // Încercăm să trimitem mesajul imediat dacă conexiunea este deschisă
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        sendQueuedMessages();
        resolve();
      } else {
        // Inițializăm WebSocket-ul dacă nu este deja conectat
        ensureConnection()
          .then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
      }
    });
  },

  /**
   * Asigură că există o conexiune WebSocket activă
   * @returns Promisiune care se rezolvă când conexiunea este stabilită
   */
  ensureConnection: (): Promise<void> => {
    return ensureConnection();
  },

  /**
   * Verifică dacă conexiunea WebSocket este deschisă
   * @returns Promisiune care se rezolvă cu starea conexiunii
   */
  isConnected: (): Promise<boolean> => {
    return isConnected();
  }
};

/**
 * Inițializează serviciul WebSocket și stabilește o conexiune
 */
export function initializeWebSocketService() {
  console.log('Initializing WebSocket service...');
  
  // Evităm inițializarea multiplă
  if (websocket !== null && websocket.readyState !== WebSocket.CLOSED) {
    console.log('WebSocket already initialized');
    return;
  }
  
  // Construim URL-ul WebSocket bazat pe locația curentă
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/api/ws`;
  
  console.log('WebSocket URL:', wsUrl);
  
  // Stabilim conexiunea WebSocket
  console.log('Connecting to WebSocket:', wsUrl);
  createWebSocketConnection(wsUrl);
}

/**
 * Creează o conexiune WebSocket
 */
function createWebSocketConnection(url: string) {
  try {
    // Resetăm starea conexiunii dacă era deja în curs de stabilire
    if (websocket !== null) {
      websocket.onopen = null;
      websocket.onclose = null;
      websocket.onerror = null;
      websocket.onmessage = null;
      
      if (websocket.readyState !== WebSocket.CLOSED) {
        websocket.close();
      }
    }
    
    // Verificăm URL-ul WebSocket pentru a preveni conexiuni non-securizate pe producție
    if (!url.startsWith('ws:') && !url.startsWith('wss:')) {
      console.error('Invalid WebSocket URL:', url);
      notifyConnectionStatus(false);
      return;
    }
    
    // Blocăm conexiunile WebSocket pentru HMR pentru a preveni probleme
    // Vite folosește WebSockets pentru HMR care pot interfera cu funcționalitatea noastră
    if (url.includes('__vite') || url.includes('vite-hmr')) {
      console.log('[WebSocket] Blocată conexiunea către HMR:', url);
      return;
    }
    
    // Permitem conexiunea doar către API-ul nostru WebSocket
    if (!url.includes('/api/ws')) {
      console.log('[WebSocket] Blocată conexiunea către:', url);
      return;
    }
    
    console.log('[WebSocket] Permisă conexiunea către:', url);
    
    // Inițializăm WebSocket
    websocket = new WebSocket(url);
    isReconnecting = false;
    
    // Configurăm handler-ele pentru evenimente WebSocket
    websocket.onopen = handleWebSocketOpen;
    websocket.onclose = handleWebSocketClose;
    websocket.onerror = handleWebSocketError;
    websocket.onmessage = handleWebSocketMessage;
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    notifyConnectionStatus(false);
  }
}

/**
 * Programează o încercare de reconectare cu algoritm de backoff exponențial
 */
function scheduleReconnect() {
  if (isReconnecting) {
    return;
  }
  
  isReconnecting = true;
  
  // Implementăm backoff exponențial pentru a evita supraîncărcarea serverului
  reconnectAttempt += 1;
  
  // Calculăm întârzierea cu o componentă aleatoare pentru a evita conexiunile sincrone
  const randomFactor = 0.5 * Math.random();
  let delay = Math.min(
    RECONNECT_DELAY_MAX,
    RECONNECT_DELAY_MIN * Math.pow(1.5, Math.min(reconnectAttempt, 10)) * (1 + randomFactor)
  );
  
  delay = Math.floor(delay);
  console.log(`Reconnecting attempt ${reconnectAttempt} in ${Math.round(delay / 1000)}s`);
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  
  reconnectTimeout = setTimeout(() => {
    if (websocket?.readyState === WebSocket.OPEN) {
      isReconnecting = false;
      return;
    }
    
    // Construim URL-ul WebSocket bazat pe locația curentă
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws`;
    
    console.log('WebSocket URL:', wsUrl);
    console.log('Connecting to WebSocket:', wsUrl);
    createWebSocketConnection(wsUrl);
  }, delay);
}

/**
 * Trimite un mesaj de ping pentru a menține conexiunea activă
 */
function sendPing() {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    return;
  }
  
  // Verificăm dacă conexiunea este inactivă de prea mult timp
  const currentTime = Date.now();
  if (currentTime - lastPingTime > 60000) { // 60 secunde
    // Conexiunea pare inactivă, încercăm să o închidem și să reconectăm
    websocket.close();
    return;
  }
  
  try {
    // Trimitem un mesaj simplu de ping
    websocket.send(JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() }));
  } catch (error) {
    console.error('Error sending ping:', error);
    notifyConnectionStatus(false);
  }
}

/**
 * Notifică toți ascultătorii despre starea conexiunii
 */
function notifyConnectionStatus(connected: boolean) {
  connectionStatusListeners.forEach(listener => {
    try {
      listener(connected);
    } catch (error) {
      console.error('Error in connection status listener:', error);
    }
  });
}

/**
 * Trimite toate mesajele din coadă
 */
function sendQueuedMessages() {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    return;
  }
  
  // Procesăm toate mesajele din coadă
  while (messageQueue.length > 0) {
    const message = messageQueue.shift();
    if (!message) continue;
    
    // Curățăm timeout-ul pentru acest mesaj
    clearTimeout(message.timeout);
    
    try {
      // Trimitem mesajul
      websocket.send(JSON.stringify(message.data));
    } catch (error) {
      console.error('Error sending queued message:', error);
      notifyConnectionStatus(false);
    }
  }
}

/**
 * Asigură că există o conexiune WebSocket activă
 */
async function ensureConnection(): Promise<void> {
  // Dacă conexiunea este deja deschisă, nu facem nimic
  if (await isConnected()) {
    return;
  }
  
  // Inițializăm WebSocket-ul dacă nu există
  if (websocket === null || websocket.readyState === WebSocket.CLOSED) {
    initializeWebSocketService();
  }
  
  // Așteptăm să se deschidă conexiunea
  return new Promise((resolve, reject) => {
    // Verificăm dacă conexiunea s-a deschis între timp
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    
    // Setăm un timeout pentru rezolvarea promisiunii
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout la conectarea WebSocket'));
    }, 10000); // 10 secunde
    
    // Adăugăm un handler temporar pentru evenimentul onopen
    const originalOnOpen = websocket?.onopen;
    if (websocket) {
      websocket.onopen = (event) => {
        // Apelăm handler-ul original
        if (originalOnOpen) {
          originalOnOpen.call(websocket, event);
        }
        
        // Curățăm timeout-ul
        clearTimeout(timeoutId);
        
        // Rezolvăm promisiunea
        resolve();
      };
    } else {
      clearTimeout(timeoutId);
      reject(new Error('WebSocket nu a putut fi inițializat'));
    }
  });
}

/**
 * Verifică dacă conexiunea WebSocket este deschisă
 * @returns Promise care se rezolvă cu starea conexiunii
 */
async function isConnected(): Promise<boolean> {
  // Dacă nu există websocket sau starea nu este OPEN, nu suntem conectați
  return websocket !== null && websocket.readyState === WebSocket.OPEN;
}

/**
 * Gestionează evenimentul de deschidere a conexiunii WebSocket
 */
function handleWebSocketOpen() {
  console.log('WebSocket connection established');
  
  // Resetăm contorul de încercări de reconectare
  reconnectAttempt = 0;
  
  // Curățăm orice timeout de reconectare existent
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  // Configurăm un interval de ping pentru a menține conexiunea deschisă
  if (pingInterval) {
    clearInterval(pingInterval);
  }
  
  lastPingTime = Date.now();
  pingInterval = setInterval(sendPing, 30000); // Trimitem ping la fiecare 30 secunde
  
  // Procesăm eventualele mesaje din coadă
  sendQueuedMessages();
  
  // Notificăm ascultătorii despre starea conexiunii
  notifyConnectionStatus(true);
}

/**
 * Gestionează evenimentul de închidere a conexiunii WebSocket
 */
function handleWebSocketClose(event: CloseEvent) {
  console.log('WebSocket connection closed:', event.code, event.reason);
  
  // Curățăm intervalul de ping
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  
  // Curățăm timeout-ul de reconectare existent
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  // Notificăm toți handlerii despre deconectare
  const disconnectMessage = {
    type: 'DISCONNECTED', 
    message: 'WebSocket connection closed'
  };
  
  messageHandlers.forEach(handler => {
    try {
      handler(disconnectMessage);
    } catch (err) {
      console.error('Error in message handler:', err);
    }
  });
  
  // Notificăm ascultătorii despre starea conexiunii
  notifyConnectionStatus(false);
  
  // Programăm o reconectare dacă nu am început deja acest proces
  if (!isReconnecting) {
    scheduleReconnect();
  }
}

/**
 * Gestionează erori în conexiunea WebSocket
 */
function handleWebSocketError(event: Event) {
  console.error('WebSocket error occurred:', event);
  
  // Notificăm toți handlerii despre eroare
  const errorMessage = {
    type: 'ERROR', 
    message: 'WebSocket connection error'
  };
  
  messageHandlers.forEach(handler => {
    try {
      handler(errorMessage);
    } catch (err) {
      console.error('Error in message handler:', err);
    }
  });
  
  // Nu încheiăm conexiunea aici, vom lăsa handlerul onclose să o facă
  // websocket.close(); // Nu forțăm închiderea
}

/**
 * Gestionează mesaje primite de la server
 */
function handleWebSocketMessage(event: MessageEvent) {
  try {
    const data = JSON.parse(event.data);
    
    // Actualizăm timpul ultimului ping pentru a menține conexiunea
    lastPingTime = Date.now();
    
    // Ignorăm mesajele de tip ping/pong
    if (data.type === 'PONG') {
      return;
    }
    
    // Apelăm toți handlerii înregistrați pentru procesarea mesajelor
    messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error('Error in message handler:', err);
      }
    });
  } catch (error) {
    console.error('Error processing WebSocket message:', error, event.data);
  }
}

// Initialize when imported
initializeWebSocketService();

export default websocketService;
