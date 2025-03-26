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

  // Verificăm dacă mesajul este pentru notificare
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const notifData = event.data.payload;

    self.registration.showNotification(
      notifData.title || 'Notificare Carvizio', 
      {
        body: notifData.body || 'Aveți o notificare nouă',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notifData.tag || 'message-' + new Date().getTime(),
        data: { url: notifData.url || '/' },
        requireInteraction: notifData.requireInteraction !== false
      }
    ).then(() => {
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
});

// Interceptează request-urile de rețea - nu facem nimic deocamdată
// Service Worker-ul este folosit doar pentru notificări în acest moment
self.addEventListener('fetch', event => {
  // Permitem request-urilor să meargă normal către server
  return;
});