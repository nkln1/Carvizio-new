
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

// Stocăm temporar mesajele dacă conexiunea nu este stabilită
const messageQueue: { message: any; resolve: (value: any) => void; reject: (reason?: any) => void }[] = [];

/**
 * Adaugă un handler pentru procesarea mesajelor primite
 */
export function addMessageHandler(handler: (data: any) => void) {
  messageHandlers.push(handler);
}

/**
 * Adaugă un listener pentru schimbări în starea conexiunii
 */
export function addConnectionStatusListener(listener: (status: boolean) => void) {
  connectionStatusListeners.push(listener);
  
  // Trimite starea curentă noului listener
  isConnected().then(status => {
    listener(status);
  });
}

/**
 * Elimină un listener pentru schimbări în starea conexiunii
 */
export function removeConnectionStatusListener(listener: (status: boolean) => void) {
  const index = connectionStatusListeners.indexOf(listener);
  if (index !== -1) {
    connectionStatusListeners.splice(index, 1);
  }
}

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
    scheduleReconnect();
    notifyConnectionStatus(false);
  }
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
  processMessageQueue();
  
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
 * Trimite un mesaj ping pentru a menține conexiunea activă
 */
function sendPing() {
  if (websocket?.readyState === WebSocket.OPEN) {
    try {
      const elapsedTime = Date.now() - lastPingTime;
      
      // Dacă nu am primit niciun mesaj în ultimul minut, forțăm reconectarea
      if (elapsedTime > 60000) {
        console.log('No messages received for 60s, forcing reconnect');
        
        if (websocket) {
          websocket.close();
        }
        
        scheduleReconnect();
        return;
      }
      
      // Trimitem un ping normal
      websocket.send(JSON.stringify({ type: 'PING' }));
    } catch (error) {
      console.error('Error sending ping:', error);
    }
  }
}

/**
 * Verifică dacă WebSocket este conectat
 * @returns Promise care se rezolvă cu starea conexiunii
 */
async function isConnected(): Promise<boolean> {
  // Dacă nu există websocket sau starea nu este OPEN, nu suntem conectați
  return websocket !== null && websocket.readyState === WebSocket.OPEN;
}

/**
 * Notifică toți ascultătorii despre schimbarea stării conexiunii
 */
function notifyConnectionStatus(status: boolean) {
  connectionStatusListeners.forEach(listener => {
    try {
      listener(status);
    } catch (error) {
      console.error('Error in connection status listener:', error);
    }
  });
}

/**
 * Asigură că există o conexiune WebSocket activă
 * @returns Promise care se rezolvă când conexiunea este stabilită
 */
export async function ensureConnection(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (websocket === null || websocket.readyState !== WebSocket.OPEN) {
      if (!websocket || websocket.readyState === WebSocket.CLOSED) {
        initializeWebSocketService();
      }
      
      const checkInterval = setInterval(() => {
        if (websocket?.readyState === WebSocket.OPEN) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout pentru a evita blocarea
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('WebSocket connection timed out'));
      }, 5000);
    } else {
      resolve();
    }
  });
}

/**
 * Trimite un mesaj prin WebSocket
 * @param message Mesajul de trimis
 * @returns Promise care se rezolvă cu răspunsul
 */
export async function sendMessage(message: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      // Generăm un ID unic pentru acest mesaj
      const messageId = uuidv4();
      const messageWithId = {
        ...message,
        id: messageId
      };
      
      // Funcția de timeout pentru a evita blocarea
      const timeoutFunc = setTimeout(() => {
        reject(new Error('WebSocket message timed out'));
      }, MESSAGE_TIMEOUT);
      
      // Adăugăm mesajul în coadă
      messageQueue.push({
        message: messageWithId,
        resolve: (value) => {
          clearTimeout(timeoutFunc);
          resolve(value);
        },
        reject: (reason) => {
          clearTimeout(timeoutFunc);
          reject(reason);
        }
      });
      
      // Încercăm să trimitem imediat dacă suntem conectați
      await ensureConnection()
        .then(() => processMessageQueue())
        .catch(error => {
          console.warn('WebSocket not connected, message queued:', messageWithId);
          // Nu respingem aici, vom păstra mesajul în coadă pentru încercări viitoare
        });
    } catch (error) {
      console.error('Error in sendMessage:', error);
      reject(error);
    }
  });
}

/**
 * Procesează mesajele din coadă atunci când conexiunea este disponibilă
 */
function processMessageQueue() {
  if (websocket === null || websocket.readyState !== WebSocket.OPEN) {
    return;
  }
  
  // Verificăm dacă avem mesaje în coadă
  if (messageQueue.length === 0) {
    return;
  }
  
  console.log(`Processing message queue (${messageQueue.length} messages)`);
  
  // Parcurgem toate mesajele din coadă
  while (messageQueue.length > 0) {
    const { message, resolve, reject } = messageQueue.shift()!;
    
    try {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(message));
        resolve({ success: true, messageId: message.id });
      } else {
        // Punem mesajul înapoi în coadă
        messageQueue.unshift({ message, resolve, reject });
        break;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      reject(error);
    }
  }
}

// Exportăm funcții și variabile utile
const websocketService = {
  initialize: initializeWebSocketService,
  ensureConnection,
  sendMessage,
  addMessageHandler,
  addConnectionStatusListener,
  removeConnectionStatusListener,
  isConnected
};

export default websocketService;
