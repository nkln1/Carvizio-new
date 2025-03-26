// sw.js - Service Worker pentru notificări în fundal
// Acest fișier trebuie plasat în directorul public

// Versiune cache pentru actualizări
const CACHE_VERSION = 'v1';
const CACHE_NAME = `carvizio-cache-${CACHE_VERSION}`;

// Eveniment de instalare - pregătește service worker-ul
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalare');

  // Treci peste așteptarea până când old service worker-ul termină
  self.skipWaiting();

  // Nu e nevoie să punem resursele în cache deocamdată,
  // ne concentrăm doar pe notificări
});

// Eveniment de activare - activează noul service worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activare');

  // Preia imediat controlul paginilor deschise
  event.waitUntil(self.clients.claim());

  // Curăță cache-urile vechi dacă există
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('carvizio-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('[Service Worker] Ștergere cache vechi:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Gestionează evenimentele de notificări push
self.addEventListener('push', event => {
  console.log('[Service Worker] Am primit un eveniment push');

  // Verificăm dacă evenimentul push conține date
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
      console.log('[Service Worker] Date push:', data);
    } catch (e) {
      console.log('[Service Worker] Nu s-au putut parsa datele push', e);
      data = {
        title: 'Notificare nouă',
        body: event.data.text()
      };
    }
  }

  // Valori implicite pentru notificare dacă datele sunt incomplete
  const title = data.title || 'Notificare Carvizio';
  const options = {
    body: data.body || 'Aveți o notificare nouă',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'default',
    data: { url: data.url || '/' },
    requireInteraction: true,
    actions: data.actions || []
  };

  // Afișează notificarea
  event.waitUntil(self.registration.showNotification(title, options));
});

// Gestionează evenimentele de click pe notificări
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Click pe notificare', event.notification);

  // Închide notificarea
  event.notification.close();

  // URL-ul către care să redirecționeze utilizatorul
  const urlToOpen = event.notification.data && event.notification.data.url ? 
                    new URL(event.notification.data.url, self.location.origin).href : 
                    '/';

  // Verifică dacă există deja un client deschis cu aplicația și focusează-l
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Verifică dacă există vreun client deschis
        for (const client of clientList) {
          // Dacă găsim un client deschis, îl focusăm
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // Dacă nu există un client deschis, deschidem o fereastră nouă
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Gestionează evenimentele de mesaje între pagină și service worker
self.addEventListener('message', event => {
  console.log('[Service Worker] Am primit un mesaj', event.data);

  // Dacă nu avem date de mesaj, nu facem nimic
  if (!event.data || !event.data.type) {
    return;
  }

  switch (event.data.type) {
    case 'SHOW_NOTIFICATION':
      handleShowNotification(event);
      break;
    
    case 'START_PERIODIC_CHECK':
      // Pornește verificarea periodică a mesajelor
      if (event.data.payload) {
        startPeriodicMessageCheck(event.data.payload);
        
        // Confirmă către pagină că am pornit verificarea
        if (event.source) {
          event.source.postMessage({
            type: 'PERIODIC_CHECK_STARTED',
            success: true
          });
        }
      }
      break;
    
    case 'STOP_PERIODIC_CHECK':
      // Oprește verificarea periodică a mesajelor
      stopPeriodicMessageCheck();
      
      // Confirmă către pagină că am oprit verificarea
      if (event.source) {
        event.source.postMessage({
          type: 'PERIODIC_CHECK_STOPPED',
          success: true
        });
      }
      break;
    
    case 'TEST_NOTIFICATION':
      // Afișează o notificare de test
      self.registration.showNotification('Test Notificare', {
        body: 'Aceasta este o notificare de test din Service Worker',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-' + Date.now(),
        requireInteraction: true
      }).then(() => {
        console.log('[Service Worker] Notificare de test afișată cu succes');
        if (event.source) {
          event.source.postMessage({
            type: 'TEST_NOTIFICATION_RESULT',
            success: true
          });
        }
      }).catch(error => {
        console.error('[Service Worker] Eroare la afișarea notificării de test:', error);
        if (event.source) {
          event.source.postMessage({
            type: 'TEST_NOTIFICATION_RESULT',
            success: false,
            error: error.message
          });
        }
      });
      break;
  }
});

// Funcție pentru gestionarea cererilor de afișare a notificărilor
function handleShowNotification(event) {
  const notifData = event.data.payload;

  // Verificăm permisiunea pentru notificări
  if (Notification.permission !== 'granted') {
    console.warn('[Service Worker] Permisiunea pentru notificări nu este acordată');
    if (event.source) {
      event.source.postMessage({
        type: 'NOTIFICATION_SHOWN',
        success: false,
        error: 'Permisiunea pentru notificări nu este acordată'
      });
    }
    return;
  }

  console.log('[Service Worker] Afișare notificare:', notifData);

  self.registration.showNotification(
    notifData.title || 'Notificare Carvizio', 
    {
      body: notifData.body || 'Aveți o notificare nouă',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notifData.tag || 'message-' + new Date().getTime(),
      data: { url: notifData.url || '/' },
      requireInteraction: notifData.requireInteraction !== false,
      vibrate: [200, 100, 200] // Adăugăm vibrație pentru dispozitivele mobile
    }
  ).then(() => {
    console.log('[Service Worker] Notificare afișată cu succes');
    // Notificăm pagina că s-a afișat notificarea
    if (event.source) {
      event.source.postMessage({
        type: 'NOTIFICATION_SHOWN',
        success: true
      });
    }
  }).catch(error => {
    console.error('[Service Worker] Eroare la afișarea notificării:', error);
    if (event.source) {
      event.source.postMessage({
        type: 'NOTIFICATION_SHOWN',
        success: false,
        error: error.message
      });
    }
  });
}

// Interceptează request-urile de rețea - nu facem nimic deocamdată
// Service Worker-ul este folosit doar pentru notificări în acest moment
self.addEventListener('fetch', event => {
  // Permitem request-urilor să meargă normal către server
  return;
});

// Adăugăm un interval pentru verificarea periodică a mesajelor noi, chiar și când tab-ul este inactiv
let checkMessagesInterval = null;

// Funcție pentru a porni verificarea periodică a mesajelor
function startPeriodicMessageCheck(options = {}) {
  if (checkMessagesInterval) {
    clearInterval(checkMessagesInterval);
  }

  const interval = options.interval || 30000; // Implicit la 30 de secunde
  const userId = options.userId;
  const userRole = options.userRole;
  const token = options.token;

  console.log('[Service Worker] Pornire verificare periodică a mesajelor pentru utilizator:', userId, 'rol:', userRole);

  // Setăm intervalul pentru verificare
  checkMessagesInterval = setInterval(() => {
    checkForNewMessages(userId, userRole, token);
  }, interval);

  // Verificăm imediat prima dată
  checkForNewMessages(userId, userRole, token);
}

// Funcție pentru a opri verificarea periodică
function stopPeriodicMessageCheck() {
  if (checkMessagesInterval) {
    clearInterval(checkMessagesInterval);
    checkMessagesInterval = null;
    console.log('[Service Worker] Oprire verificare periodică a mesajelor');
  }
}

// Funcție pentru a verifica mesajele noi
function checkForNewMessages(userId, userRole, token) {
  if (!userId || !userRole || !token) {
    console.warn('[Service Worker] Lipsesc datele necesare pentru verificarea mesajelor');
    return;
  }

  console.log('[Service Worker] Verificare mesaje noi pentru utilizator:', userId, 'rol:', userRole);

  // Construim URL-ul API în funcție de rolul utilizatorului
  const apiUrl = `/api/${userRole === 'service' ? 'service' : 'client'}/messages/unread`;
  
  fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('[Service Worker] Răspuns verificare mesaje:', data);
    
    // Verificăm dacă sunt mesaje noi și afișăm notificări pentru acestea
    if (data && data.newMessages && data.newMessages.length > 0) {
      // Procesăm fiecare mesaj nou
      data.newMessages.forEach(message => {
        // Afișăm notificare pentru fiecare mesaj nou
        self.registration.showNotification('Mesaj nou', {
          body: message.content || 'Ați primit un mesaj nou',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `message-${Date.now()}`,
          data: { 
            url: `/${userRole === 'service' ? 'service-dashboard' : 'dashboard'}?tab=messages`,
            messageId: message.id
          },
          requireInteraction: true
        });
      });
    }
  })
  .catch(error => {
    console.error('[Service Worker] Eroare la verificarea mesajelor noi:', error);
  });
}