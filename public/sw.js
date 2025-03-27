// @ts-check
/**
 * Service Worker principal pentru aplicație
 * Acest fișier se ocupă de verificarea mesajelor în fundal și afișarea notificărilor
 * @version 1.0.3
 */

// Versiunea Service Worker-ului (se modifică pentru a forța actualizarea)
const VERSION = 'v1.0.3';

// Resurse pentru caching
const CACHE_NAME = 'service-dashboard-cache-' + VERSION;

// La instalare, punem în cache resursele esențiale
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalare în curs...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/favicon.ico'
      ]);
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
  
  return self.registration.showNotification(title, {
    badge: '/favicon.ico',
    icon: '/favicon.ico',
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

// Verifică dacă există mesaje noi pentru utilizator
function checkForNewMessages(userId, userRole, token) {
  if (!userId || !userRole || !token) {
    console.error('[Service Worker] Date lipsă pentru verificarea mesajelor');
    return Promise.reject(new Error('Date lipsă pentru verificarea mesajelor'));
  }
  
  console.log('[Service Worker] Verificare mesaje noi pentru utilizator:', userId);
  
  // Verificăm dacă avem token
  if (!token) {
    console.warn('[Service Worker] Token-ul de autentificare lipsește, nu se pot verifica mesajele');
    return Promise.reject(new Error('Token-ul de autentificare lipsește'));
  }
  
  // URL-ul pentru API-ul de verificare a mesajelor
  const apiUrl = userRole === 'service' 
    ? '/api/service/unread-messages-count' 
    : '/api/client/unread-messages-count';
  
  return fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
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
  
  // Tratăm diferitele tipuri de mesaje
  switch (event.data.type) {
    case 'SHOW_NOTIFICATION':
      event.waitUntil(handleShowNotification(event));
      break;
      
    case 'START_BACKGROUND_MESSAGE_CHECK':
      const result = startPeriodicMessageCheck(event.data.payload);
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage(result);
      }
      break;
      
    case 'STOP_BACKGROUND_MESSAGE_CHECK':
      const stopResult = stopPeriodicMessageCheck();
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage(stopResult);
      }
      break;
      
    case 'TEST_NOTIFICATION':
      event.waitUntil(
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
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ 
              type: 'TEST_NOTIFICATION_RESULT', 
              success: true 
            });
          }
        })
        .catch(error => {
          console.error('[Service Worker] Eroare la testarea notificării:', error);
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ 
              type: 'TEST_NOTIFICATION_RESULT', 
              success: false, 
              error: error.message 
            });
          }
        })
      );
      break;
      
    case 'PAGE_LOADED':
      console.log('[Service Worker] Pagină încărcată');
      break;
      
    default:
      console.log('[Service Worker] Tip de mesaj necunoscut:', event.data.type);
  }
});

// Afișează un mesaj în consolă pentru a confirma că Service Worker-ul a fost încărcat
console.log('[Service Worker] Script încărcat cu versiunea:', VERSION);