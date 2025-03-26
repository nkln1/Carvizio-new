// Service Worker Registration Script
// Acest script trebuie inclus în pagina HTML pentru a înregistra Service Worker-ul

/**
 * Înregistrează Service Worker-ul pentru aplicație
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js')
        .then(function(registration) {
          console.log('Service Worker înregistrat cu succes:', registration.scope);
          window.swRegistration = registration;
          
          // Verificăm dacă browserul suportă notificări push
          checkPushSupport(registration);
          
          // Expunem funcțiile către Window pentru a putea fi folosite de alte componente
          window.showNotificationViaSW = function(title, options = {}) {
            return new Promise((resolve, reject) => {
              if (!navigator.serviceWorker.controller) {
                console.warn('Service Worker nu este activ, folosim notificări standard');
                try {
                  const notification = new Notification(title, options);
                  resolve(notification);
                } catch (error) {
                  reject(error);
                }
                return;
              }
              
              const messageChannel = new MessageChannel();
              
              messageChannel.port1.onmessage = function(event) {
                if (event.data.error) {
                  reject(event.data.error);
                } else {
                  resolve(event.data.success);
                }
              };
              
              // Trimitem mesaj către Service Worker pentru a afișa notificarea
              navigator.serviceWorker.controller.postMessage({
                type: 'SHOW_NOTIFICATION',
                payload: { title, options }
              }, [messageChannel.port2]);
            });
          };
          
          window.startBackgroundMessageCheck = function(options = {}) {
            return new Promise((resolve, reject) => {
              if (!navigator.serviceWorker.controller) {
                reject(new Error('Service Worker nu este activ'));
                return;
              }
              
              const messageChannel = new MessageChannel();
              
              messageChannel.port1.onmessage = function(event) {
                if (event.data.error) {
                  reject(event.data.error);
                } else {
                  resolve(event.data.success);
                }
              };
              
              // Trimitem mesaj către Service Worker pentru a începe verificarea mesajelor în fundal
              navigator.serviceWorker.controller.postMessage({
                type: 'START_BACKGROUND_MESSAGE_CHECK',
                payload: options
              }, [messageChannel.port2]);
            });
          };
          
          window.stopBackgroundMessageCheck = function() {
            return new Promise((resolve, reject) => {
              if (!navigator.serviceWorker.controller) {
                resolve(); // Nu există Service Worker activ, deci nu avem ce opri
                return;
              }
              
              const messageChannel = new MessageChannel();
              
              messageChannel.port1.onmessage = function(event) {
                if (event.data.error) {
                  reject(event.data.error);
                } else {
                  resolve(event.data.success);
                }
              };
              
              // Trimitem mesaj către Service Worker pentru a opri verificarea mesajelor în fundal
              navigator.serviceWorker.controller.postMessage({
                type: 'STOP_BACKGROUND_MESSAGE_CHECK'
              }, [messageChannel.port2]);
            });
          };
          
          // Transmitem mesajul către Service Worker pentru a-i comunica că pagina este încărcată
          sendMessageToSW({ type: 'PAGE_LOADED' });
        })
        .catch(function(error) {
          console.error('Eroare la înregistrarea Service Worker:', error);
        });
    });
  } else {
    console.warn('Acest browser nu suportă Service Workers');
  }
}

/**
 * Verifică dacă browserul suportă notificări push
 * @param {ServiceWorkerRegistration} registration - Înregistrarea Service Worker-ului
 */
function checkPushSupport(registration) {
  if ('PushManager' in window) {
    console.log('Acest browser suportă notificări push');
    
    // Aici putem adăuga logica pentru a abona utilizatorul la notificări push
    // Exemplu: registration.pushManager.subscribe({...});
  } else {
    console.warn('Acest browser nu suportă notificări push');
  }
}

/**
 * Trimite un mesaj către Service Worker
 * @param {Object} message - Mesajul de trimis
 */
function sendMessageToSW(message) {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  } else {
    console.warn('Nu există un Service Worker activ pentru a trimite mesaje');
  }
}

/**
 * Afișează o notificare folosind Service Worker-ul
 * @param {string} title - Titlul notificării
 * @param {Object} options - Opțiunile notificării
 * @returns {Promise} - Promisiune care se rezolvă când notificarea a fost afișată
 */
function showNotificationViaSW(title, options = {}) {
  if (window.showNotificationViaSW) {
    return window.showNotificationViaSW(title, options);
  }
  
  return new Promise((resolve, reject) => {
    if (!('Notification' in window)) {
      reject(new Error('Acest browser nu suportă notificări'));
      return;
    }
    
    if (Notification.permission !== 'granted') {
      reject(new Error('Permisiunea pentru notificări nu este acordată'));
      return;
    }
    
    try {
      const notification = new Notification(title, options);
      resolve(notification);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Pornește verificarea mesajelor în fundal
 * @param {Object} options - Opțiunile pentru verificarea mesajelor
 * @returns {Promise} - Promisiune care se rezolvă când verificarea a fost pornită
 */
function startBackgroundMessageCheck(options = {}) {
  if (window.startBackgroundMessageCheck) {
    return window.startBackgroundMessageCheck(options);
  }
  
  return Promise.reject(new Error('Funcția de verificare a mesajelor în fundal nu este disponibilă'));
}

/**
 * Oprește verificarea mesajelor în fundal
 * @returns {Promise} - Promisiune care se rezolvă când verificarea a fost oprită
 */
function stopBackgroundMessageCheck() {
  if (window.stopBackgroundMessageCheck) {
    return window.stopBackgroundMessageCheck();
  }
  
  return Promise.resolve(); // Nu există funcția, deci nu avem ce opri
}

// Înregistrăm Service Worker-ul
registerServiceWorker();