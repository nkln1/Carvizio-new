// Firebase Messaging Service Worker
// Versiunea: 1.0.0

// Versiunea service worker-ului - modificați-o la fiecare actualizare importantă
const VERSION = '1.0.0';
console.log('[Firebase Messaging SW] Script încărcat, versiunea:', VERSION);

// Importam modulele Firebase necesare din CDN
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Configurarea Firebase va fi preluată prin mesaje de la aplicație
let firebaseConfig = null;
let firebaseInitialized = false;

// Ascultăm mesajele pentru a primi configurația Firebase
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FCM_CONFIG') {
    console.log('[Firebase Messaging SW] A primit configurația FCM');
    firebaseConfig = event.data.config;

    // Inițializăm Firebase dacă nu a fost deja inițializat
    if (!firebaseInitialized && firebaseConfig) {
      try {
        firebase.initializeApp(firebaseConfig);
        firebaseInitialized = true;
        console.log('[Firebase Messaging SW] Firebase inițializat cu succes');

        // Configurăm handler-ul pentru mesaje background după inițializarea Firebase
        setupBackgroundMessageHandler();

        // Trimitem un răspuns înapoi la client
        event.ports[0]?.postMessage({ 
          success: true, 
          message: 'Firebase a fost inițializat cu succes în Service Worker'
        });
      } catch (error) {
        console.error('[Firebase Messaging SW] Eroare la inițializarea Firebase:', error);

        // Trimitem eroarea înapoi la client
        event.ports[0]?.postMessage({ 
          success: false, 
          error: error.message || 'Eroare la inițializarea Firebase' 
        });
      }
    } else if (firebaseInitialized) {
      // Dacă este deja inițializat, trimitem un răspuns de succes
      event.ports[0]?.postMessage({ 
        success: true, 
        message: 'Firebase era deja inițializat în Service Worker'
      });
    }
  }
});

// Definim funcția pentru a obține instanța de messaging
// O vom apela doar după ce Firebase este inițializat
function getMessaging() {
  if (!firebaseInitialized) {
    console.error('[Firebase Messaging SW] Firebase nu este încă inițializat');
    return null;
  }
  try {
    return firebase.messaging();
  } catch (error) {
    console.error('[Firebase Messaging SW] Eroare la obținerea instanței messaging:', error);
    return null;
  }
}

// Configurăm handler-ul pentru mesaje background în funcția de mesaje
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FCM_CONFIG') {
    // Deja am gestionat acest caz mai sus
    return;
  }
});

// Această funcție va fi apelată după ce primim configurația Firebase
function setupBackgroundMessageHandler() {
  const messaging = getMessaging();
  if (!messaging) return;

  messaging.onBackgroundMessage((payload) => {
    console.log('[Firebase Messaging SW] Mesaj primit în fundal:', payload);

    // Extragem datele din payload
    const notificationTitle = payload.notification?.title || 'Notificare nouă';
    const notificationOptions = {
      body: payload.notification?.body || 'Aveți o notificare nouă',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: payload.data?.tag || 'default',
      data: {
        url: payload.data?.url || '/',
        ...payload.data
      },
      // Adăugăm vibratia pentru dispozitive mobile
      vibrate: [200, 100, 200],
      // Solicităm ca notificarea să rămână până când utilizatorul interacționează cu ea
      requireInteraction: true
    };

    // Afișăm notificarea și adăugăm un log detaliat
    console.log('[Firebase Messaging SW] Afișez notificare:', notificationTitle, notificationOptions);
    return self.registration.showNotification(notificationTitle, notificationOptions).then(() => {
      console.log('[Firebase Messaging SW] Notificare afișată cu succes');
      return Promise.resolve();
    }).catch(error => {
      console.error('[Firebase Messaging SW] Eroare la afișarea notificării:', error);
      return Promise.reject(error);
    });
  });
}

// Handler pentru click pe notificare
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase Messaging SW] Click pe notificare', event);

  // Închide notificarea
  event.notification.close();

  // Extragem URL-ul din notificare
  const urlToOpen = event.notification.data?.url || '/';

  // Verificăm dacă există un client deschis și îl focalizăm
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Verifică dacă un client deschis are deja URL-ul potrivit
        const matchingClient = clientList.find(client => {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen, self.location.origin);

          // Comparăm pathname-ul (ignorăm query parameters pentru o potrivire mai bună)
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

// La instalare, punem în cache resursele esențiale
self.addEventListener('install', (event) => {
  console.log('[Firebase Messaging SW] Instalare...');
  self.skipWaiting(); // Forțează activarea imediată
});

// La activare, ștergem cache-urile vechi
self.addEventListener('activate', (event) => {
  console.log('[Firebase Messaging SW] Activare...');
  self.clients.claim(); // Preia controlul tuturor clienților imediat
});

console.log('[Firebase Messaging SW] Service Worker configurat cu succes');