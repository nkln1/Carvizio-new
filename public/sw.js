// @ts-check
/**
 * Service Worker principal pentru aplicație
 * Acest fișier se ocupă de verificarea mesajelor în fundal și afișarea notificărilor
 * @version 1.0.4
 */

// Versiunea Service Worker-ului (se modifică pentru a forța actualizarea)
const VERSION = 'v1.0.5';

// Resurse pentru caching
const CACHE_NAME = 'service-dashboard-cache-' + VERSION;

// Resurse importante de cache-uit
const IMPORTANT_RESOURCES = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/sounds/notification.mp3',
  '/sounds/message.mp3',
  '/sounds/request.mp3',
  '/sounds/offer.mp3'
];

// La instalare, punem în cache resursele esențiale
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalare în curs...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(IMPORTANT_RESOURCES);
    })
  );
  
  // Forțăm Service Worker-ul să devină activ imediat
  self.skipWaiting();
});

// La activare, ștergem cache-urile vechi
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activare cu versiunea:', VERSION);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Ștergere cache vechi:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Facem Service Worker-ul să preia controlul tuturor paginilor imediat
  self.clients.claim();
});

// Configurare pentru verificarea mesajelor în fundal
let backgroundCheckConfig = {
  isActive: false,
  intervalId: null,
  checkInterval: 30000, // 30 secunde între verificări
  userId: null,
  userRole: null,
  token: null
};

// Metodă pentru afișarea notificărilor
function handleShowNotification(event) {
  if (!event || !event.data) {
    console.error('[Service Worker] Event sau date lipsă pentru afișarea notificării', event);
    if (event && event.ports && event.ports[0]) {
      event.ports[0].postMessage({ 
        error: 'Date lipsă pentru afișarea notificării' 
      });
    }
    return Promise.reject(new Error('Date lipsă pentru afișarea notificării'));
  }
  
  // Verifică dacă payload există în event.data
  const payload = event.data.payload;
  if (!payload) {
    console.error('[Service Worker] Payload lipsă pentru afișarea notificării', event.data);
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ 
        error: 'Payload lipsă pentru afișarea notificației' 
      });
    }
    return Promise.reject(new Error('Payload lipsă pentru afișarea notificației'));
  }
  
  const title = payload.title || 'Notificare';
  const options = payload.options || {};
  
  console.log('[Service Worker] Afișez notificare cu opțiunile:', JSON.stringify(options));
  
  // Verificăm dacă trebuie să redăm un sunet
  if (options.data && options.data.shouldPlaySound) {
    console.log('[Service Worker] Ar trebui să redau sunetul notificării:', options.data.soundUrl);
  }
  
  return self.registration.showNotification(title, {
    badge: '/favicon.ico',
    icon: '/favicon.ico',
    requireInteraction: true, // Notificarea rămâne până când utilizatorul interacționează cu ea
    ...options,
    // Adăugăm un handler pentru click (pentru a deschide tab-ul corespunzător)
    data: {
      ...(options && options.data ? options.data : {}),
      timestamp: new Date().getTime()
    }
  })
  .then(() => {
    // Notificarea a fost afișată cu succes
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ success: true });
    }
  })
  .catch((error) => {
    console.error('[Service Worker] Eroare la afișarea notificării:', error);
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ error: error.message });
    }
  });
}

// Pornește verificarea periodică a mesajelor în fundal
function startPeriodicMessageCheck(options = {}) {
  if (backgroundCheckConfig.isActive) {
    stopPeriodicMessageCheck(); // Oprim verificarea existentă înainte de a porni una nouă
  }
  
  backgroundCheckConfig = {
    isActive: true,
    userId: options.userId,
    userRole: options.userRole,
    token: options.token,
    checkInterval: options.interval || 30000
  };
  
  console.log('[Service Worker] Pornire verificare mesaje în fundal pentru utilizator:', backgroundCheckConfig.userId);
  
  // Prima verificare imediată
  checkForNewMessages(backgroundCheckConfig.userId, backgroundCheckConfig.userRole, backgroundCheckConfig.token);
  
  // Programăm verificări periodice
  backgroundCheckConfig.intervalId = setInterval(() => {
    if (backgroundCheckConfig.isActive) {
      checkForNewMessages(backgroundCheckConfig.userId, backgroundCheckConfig.userRole, backgroundCheckConfig.token);
    }
  }, backgroundCheckConfig.checkInterval);
  
  return { success: true, message: 'Verificare mesaje în fundal pornită' };
}

// Oprește verificarea periodică a mesajelor
function stopPeriodicMessageCheck() {
  if (backgroundCheckConfig.intervalId) {
    clearInterval(backgroundCheckConfig.intervalId);
    backgroundCheckConfig.intervalId = null;
  }
  
  backgroundCheckConfig.isActive = false;
  console.log('[Service Worker] Oprire verificare mesaje în fundal');
  
  return { success: true, message: 'Verificare mesaje în fundal oprită' };
}

// Obține tokenul din localStorage (pentru verificări din fundal)
async function getAuthToken() {
  try {
    // Folosim clients.matchAll pentru a accesa fereastra clientului
    const clientList = await self.clients.matchAll();
    if (clientList.length === 0) {
      console.warn('[Service Worker] Nu s-au găsit clienți conectați');
      return null;
    }
    
    // Cerem tokenul de la client
    const tokenResponsePromise = new Promise((resolve) => {
      const channel = new MessageChannel();
      
      // Configurăm portul pentru a primi răspunsul
      channel.port1.onmessage = (event) => {
        if (event.data && event.data.token) {
          resolve(event.data.token);
        } else {
          console.warn('[Service Worker] Nu s-a putut obține tokenul de autentificare din localStorage');
          resolve(null);
        }
      };
      
      // Trimitem cererea către client
      clientList[0].postMessage({
        type: 'GET_AUTH_TOKEN'
      }, [channel.port2]);
    });
    
    // Așteptăm răspunsul cu timeout de 1 secundă
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve(null), 1000);
    });
    
    // Returnăm primul rezultat - fie tokenul, fie null după timeout
    return Promise.race([tokenResponsePromise, timeoutPromise]);
  } catch (error) {
    console.error('[Service Worker] Eroare la obținerea tokenului:', error);
    return null;
  }
}

// Verifică dacă există mesaje noi pentru utilizator
async function checkForNewMessages(userId, userRole, token) {
  if (!userId || !userRole) {
    console.error('[Service Worker] Date lipsă pentru verificarea mesajelor');
    return Promise.reject(new Error('Date lipsă pentru verificarea mesajelor'));
  }
  
  console.log('[Service Worker] Verificare mesaje noi pentru utilizator:', userId);
  
  // Încercăm să folosim tokenul furnizat direct din apel
  let authToken = token;
  
  // Dacă nu avem token, încercăm să-l obținem din localStorage prin client
  if (!authToken) {
    console.log('[Service Worker] Tokenul nu a fost furnizat, încerc obținerea din localStorage');
    authToken = await getAuthToken();
  }
  
  // Verificăm dacă avem token
  if (!authToken) {
    console.warn('[Service Worker] Token-ul de autentificare lipsește, nu se pot verifica mesajele');
    // Încercăm să accesăm clienții și să le solicităm tokenul direct
    return self.clients.matchAll()
      .then(clients => {
        if (clients.length > 0) {
          console.log('[Service Worker] Încercăm să solicităm tokenul direct de la client');
          try {
            // Trimitem un mesaj către client pentru a solicita tokenul
            clients[0].postMessage({
              type: 'REQUEST_AUTH_TOKEN',
              payload: { forceRefresh: true }
            });
            // Returnăm un promise eșuat, dar vom reîncerca cu tokenul actualizat data viitoare
            return Promise.reject(new Error('Token-ul de autentificare lipsește, solicitat de la client'));
          } catch (err) {
            console.error('[Service Worker] Eroare la solicitarea tokenului:', err);
            return Promise.reject(new Error('Nu s-a putut solicita tokenul de autentificare'));
          }
        } else {
          return Promise.reject(new Error('Token-ul de autentificare lipsește și nu există clienți activi'));
        }
      });
  }
  
  // URL-ul pentru API-ul de verificare a mesajelor
  const apiUrl = userRole === 'service' 
    ? '/api/service/unread-messages-count' 
    : '/api/client/unread-messages-count';
  
  return fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Răspuns invalid de la server: ${response.status}`);
    }
    
    // Verificăm content-type pentru a evita erori de parsare JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('[Service Worker] Răspunsul nu este JSON valid:', contentType);
      throw new Error('Răspunsul nu este în format JSON valid');
    }
    
    return response.json();
  })
  .then(data => {
    const unreadCount = data.count || 0;
    
    console.log('[Service Worker] Mesaje necitite:', unreadCount);
    
    // Afișăm notificări doar dacă există mesaje necitite
    if (unreadCount > 0) {
      // Verificăm dacă există clienți activi - dacă utilizatorul are tab-ul deschis
      // nu afișăm notificarea, deoarece va vedea deja mesajele în interfață
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
          const hasActiveClients = clients.some(client => client.visibilityState === 'visible');
          
          // Dacă nu există clienți activi sau sunt minimizați, afișăm notificarea
          if (!hasActiveClients) {
            // Verificăm dacă este disponibil sound în browser-ul utilizatorului
            // Unele browsere mobile nu permit redarea sunetelor din Service Worker direct
            try {
              // Atunci când browserul suportă atributul sound, îl folosim
              // Notă: Chrome nu suportă încă această proprietate, dar Firefox și Safari mobile o suportă
              return self.registration.showNotification('Mesaje noi', {
                body: `Aveți ${unreadCount} mesaje necitite`,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'unread-messages',
                requireInteraction: true,
                vibrate: [200, 100, 200], // Vibrație pentru dispozitive mobile
                sound: '/sounds/message.mp3', // Sunet pentru browsere care suportă acest atribut
                data: {
                  url: userRole === 'service' ? '/service-dashboard?tab=mesaje' : '/client-dashboard?tab=mesaje',
                  timestamp: new Date().getTime(),
                  shouldPlaySound: true, // Flag pentru scriptul principal să redea sunet
                  soundUrl: '/sounds/message.mp3'
                }
              });
            } catch (error) {
              console.error('[Service Worker] Eroare la afișarea notificării cu sunet:', error);
              // Fallback fără sunet
              return self.registration.showNotification('Mesaje noi', {
                body: `Aveți ${unreadCount} mesaje necitite`,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'unread-messages',
                requireInteraction: true,
                data: {
                  url: userRole === 'service' ? '/service-dashboard?tab=mesaje' : '/client-dashboard?tab=mesaje',
                  timestamp: new Date().getTime()
                }
              });
            }
          }
        });
    }
  })
  .catch(error => {
    console.error('[Service Worker] Eroare la verificarea mesajelor:', error);
    // Nu propagăm eroarea mai departe pentru a evita întreruperea Service Worker-ului
    return Promise.resolve(); // Returnăm un promise rezolvat pentru a continua execuția
  });
}

// Ascultăm evenimentele de notificare (când utilizatorul face click pe notificare)
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Click pe notificare');
  
  // Închide notificarea
  event.notification.close();
  
  // Extragem URL-ul către care să redirecționăm utilizatorul
  const urlToOpen = event.notification.data?.url || '/';
  
  // Verificăm dacă există un client deschis și îl focalizăm
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Verifică dacă un client deschis are deja URL-ul potrivit
        const matchingClient = clients.find(client => {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen, self.location.origin);
          
          // Comparăm pathname-ul (ignorăm query parameters)
          return clientUrl.pathname === targetUrl.pathname;
        });
        
        // Dacă există un client potrivit, îl focalizăm
        if (matchingClient) {
          return matchingClient.focus().then(client => {
            // Dacă există query parameters, navigăm la URL-ul exact
            if (urlToOpen.includes('?')) {
              return client.navigate(urlToOpen);
            }
          });
        }
        
        // Dacă nu există un client potrivit, deschidem un tab nou
        return self.clients.openWindow(urlToOpen);
      })
  );
});

// Ascultăm mesajele de la pagină
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Mesaj primit:', event.data);
  
  // Răspundem imediat pentru a preveni timeout-urile
  if (event.data.id) {
    // Trimitem un răspuns inițial înainte de procesare
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          id: event.data.id,
          status: 'received',
          success: true
        });
      });
    }).catch(err => {
      console.error('[Service Worker] Eroare la trimiterea răspunsului de confirmare:', err);
    });
  }
  
  // Tratăm diferitele tipuri de mesaje
  switch (event.data.type) {
    case 'SHOW_NOTIFICATION':
      // Folosim try-catch pentru a preveni terminarea Service Worker-ului
      try {
        // Extragem datele
        const title = event.data.payload?.title || 'Notificare nouă';
        const options = event.data.payload?.options || {};
        
        // Afișăm notificarea
        self.registration.showNotification(title, {
          badge: '/favicon.ico',
          icon: '/favicon.ico',
          requireInteraction: true,
          ...options,
          data: {
            ...(options.data || {}),
            timestamp: new Date().getTime()
          }
        })
        .then(() => {
          console.log('[Service Worker] Notificare afișată cu succes');
          // Trimitem confirmarea de succes
          if (event.data.id) {
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  id: event.data.id,
                  status: 'completed',
                  success: true
                });
              });
            });
          }
        })
        .catch(error => {
          console.error('[Service Worker] Eroare la afișarea notificării:', error);
          // Trimitem eroarea înapoi
          if (event.data.id) {
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  id: event.data.id,
                  status: 'error',
                  error: error.message
                });
              });
            });
          }
        });
      } catch (error) {
        console.error('[Service Worker] Excepție la procesarea notificării:', error);
      }
      break;
      
    case 'START_BACKGROUND_MESSAGE_CHECK':
      try {
        const result = startPeriodicMessageCheck(event.data.payload);
        // Trimitem rezultatul înapoi
        if (event.data.id) {
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                id: event.data.id,
                status: 'completed',
                success: true,
                result
              });
            });
          });
        }
      } catch (error) {
        console.error('[Service Worker] Eroare la pornirea verificării de fundal:', error);
      }
      break;
      
    case 'STOP_BACKGROUND_MESSAGE_CHECK':
      try {
        const stopResult = stopPeriodicMessageCheck();
        // Trimitem rezultatul înapoi
        if (event.data.id) {
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                id: event.data.id,
                status: 'completed',
                success: true,
                result: stopResult
              });
            });
          });
        }
      } catch (error) {
        console.error('[Service Worker] Eroare la oprirea verificării de fundal:', error);
      }
      break;
      
    case 'TEST_NOTIFICATION':
      try {
        self.registration.showNotification(
          event.data.payload?.title || 'Test Service Worker', 
          {
            body: event.data.payload?.body || 'Aceasta este o notificare de test.',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: event.data.payload?.tag || 'test-notification',
            requireInteraction: true
          }
        )
        .then(() => {
          console.log('[Service Worker] Test notificare reușit');
          if (event.data.id) {
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  id: event.data.id, 
                  type: 'TEST_NOTIFICATION_RESULT', 
                  status: 'completed',
                  success: true 
                });
              });
            });
          }
        })
        .catch(error => {
          console.error('[Service Worker] Eroare la testarea notificării:', error);
          if (event.data.id) {
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  id: event.data.id,
                  type: 'TEST_NOTIFICATION_RESULT', 
                  status: 'error',
                  success: false, 
                  error: error.message 
                });
              });
            });
          }
        });
      break;
      
    case 'PAGE_LOADED':
      console.log('[Service Worker] Pagină încărcată');
      break;
      
    case 'GET_AUTH_TOKEN':
      // Tratăm cererea de token, dar portul de răspuns a fost deja setat în getAuthToken()
      console.log('[Service Worker] Primită cerere GET_AUTH_TOKEN');
      break;
      
    case 'AUTH_TOKEN_RESPONSE':
      // Răspuns cu token de la pagină
      if (event.data.token) {
        console.log('[Service Worker] Token de autentificare primit de la pagină');
        // Actualizăm token-ul în configurația de verificare
        if (backgroundCheckConfig.isActive) {
          backgroundCheckConfig.token = event.data.token;
        }
      } else {
        console.warn('[Service Worker] Răspuns de token primit, dar tokenul lipsește');
      }
      break;
      
    case 'REQUEST_AUTH_TOKEN':
      // Cerere de la service worker către client pentru token
      console.log('[Service Worker] Cerere primită pentru token auth');
      break;
      
    default:
      console.log('[Service Worker] Tip de mesaj necunoscut:', event.data.type);
  }
});

// Afișează un mesaj în consolă pentru a confirma că Service Worker-ul a fost încărcat
console.log('[Service Worker] Script încărcat cu versiunea:', VERSION);