// Service Worker Registration Script
// Acest script se ocupă cu înregistrarea service worker-ului și gestionarea notificărilor

(function() {
  'use strict';

  // Verifică dacă browserul suportă Service Workers
  if ('serviceWorker' in navigator) {
    console.log('Service Workers sunt suportați de acest browser');

    // Înregistrează service worker-ul principal
    registerServiceWorker('/sw.js')
      .then(registration => {
        console.log('Service Worker înregistrat cu succes:', registration);
        setupNotificationHelpers(registration);
      })
      .catch(error => {
        console.error('Eroare la înregistrarea Service Worker:', error);
      });

    // Înregistrează service worker-ul Firebase dacă există
    if (window.location.pathname.includes('dashboard')) {
      registerServiceWorker('/firebase-messaging-sw.js')
        .then(registration => {
          console.log('Firebase Messaging Service Worker înregistrat:', registration);
        })
        .catch(error => {
          console.error('Eroare la înregistrarea Firebase Service Worker:', error);
        });
    }
  } else {
    console.warn('Acest browser nu suportă Service Workers');
  }

  /**
   * Înregistrează un service worker
   * @param {string} path - Calea către fișierul service worker
   * @returns {Promise<ServiceWorkerRegistration>} - Promisiune cu înregistrarea
   */
  function registerServiceWorker(path) {
    return navigator.serviceWorker.register(path, {
      scope: path === '/firebase-messaging-sw.js' ? '/' : '/'
    });
  }

  /**
   * Configurează helper-ele pentru notificări
   * @param {ServiceWorkerRegistration} registration - Înregistrarea service worker-ului
   */
  function setupNotificationHelpers(registration) {
    // Adaugă funcția pentru afișarea notificărilor prin Service Worker
    window.showNotificationViaSW = function(title, options = {}) {
      return new Promise((resolve, reject) => {
        // Verifică dacă service worker-ul este activ
        if (!navigator.serviceWorker.controller) {
          console.warn('Service Worker nu este activ, folosim API-ul standard Notification');
          try {
            new Notification(title, options);
            resolve();
          } catch (error) {
            reject(error);
          }
          return;
        }

        // Creează un canal de comunicare
        const messageChannel = new MessageChannel();

        // Configurează portul pentru răspunsul de la service worker
        messageChannel.port1.onmessage = (event) => {
          if (event.data.error) {
            reject(event.data.error);
          } else {
            resolve(event.data);
          }
        };

        // Trimite mesajul către service worker
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: { title, options }
        }, [messageChannel.port2]);
      });
    };

    // Adaugă funcția pentru a porni verificarea mesajelor în fundal
    window.startBackgroundMessageCheck = function(options = {}) {
      return new Promise((resolve, reject) => {
        if (!navigator.serviceWorker.controller) {
          reject(new Error('Service Worker nu este activ'));
          return;
        }

        // Creează un canal de comunicare
        const messageChannel = new MessageChannel();

        // Configurează portul pentru răspunsul de la service worker
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };

        // Trimite mesajul către service worker
        navigator.serviceWorker.controller.postMessage({
          type: 'START_BACKGROUND_MESSAGE_CHECK',
          payload: options
        }, [messageChannel.port2]);
      });
    };

    // Adaugă funcția pentru a opri verificarea mesajelor în fundal
    window.stopBackgroundMessageCheck = function() {
      return new Promise((resolve, reject) => {
        if (!navigator.serviceWorker.controller) {
          reject(new Error('Service Worker nu este activ'));
          return;
        }

        // Creează un canal de comunicare
        const messageChannel = new MessageChannel();

        // Configurează portul pentru răspunsul de la service worker
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };

        // Trimite mesajul către service worker
        navigator.serviceWorker.controller.postMessage({
          type: 'STOP_BACKGROUND_MESSAGE_CHECK'
        }, [messageChannel.port2]);
      });
    };

    // Informează service worker-ul că pagina a fost încărcată
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PAGE_LOADED'
      });
    }
  }

  // Ascultă pentru evenimentele de control al service worker-ului
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Service Worker controller a fost schimbat');

    // Reîncărcăm pagina pentru a asigura funcționarea corectă cu noul service worker
    // window.location.reload();
  });

  // Ascultă pentru mesajele de la service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('Mesaj primit de la Service Worker:', event.data);

    // Procesăm mesajele primite de la service worker
    if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
      // Gestionăm click-ul pe notificare
      console.log('Utilizatorul a făcut click pe notificare:', event.data.payload);
    }
  });
})();