// Acest fișier trebuie inclus în index.html sau adăugat în bundle-ul principal

// Funcție pentru înregistrarea Service Worker-ului
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker înregistrat cu succes:', registration.scope);

          // Salvăm registration pentru a-l folosi mai târziu
          window.swRegistration = registration;

          // Verificăm dacă browser-ul suportă notificările push
          checkPushSupport(registration);
        })
        .catch(error => {
          console.error('Eroare la înregistrarea Service Worker:', error);
        });
    });
  } else {
    console.warn('Service Workers nu sunt suportați de acest browser');
  }
}

// Verifică dacă browser-ul suportă notificările push
function checkPushSupport(registration) {
  if (!('PushManager' in window)) {
    console.warn('Push notifications nu sunt suportate de acest browser');
    return;
  }

  // Verificăm permisiunea actuală
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      console.log('Permisiune pentru notificări acordată anterior');

      // Putem încerca să ne abonăm la notificări push dacă dorim
      // Deocamdată vom folosi doar mesaje către Service Worker
    }
  });
}

// Funcție pentru a trimite mesaje către Service Worker
function sendMessageToSW(message) {
  return new Promise((resolve, reject) => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      reject(new Error('Service Worker nu este disponibil'));
      return;
    }

    // Creăm un ID unic pentru mesaj
    const messageId = new Date().getTime().toString();
    message.id = messageId;

    // Setăm un timeout pentru a evita blocarea
    const timeout = setTimeout(() => {
      reject(new Error('Timeout la trimiterea mesajului către Service Worker'));
    }, 2000);

    // Ascultător pentru răspuns
    const messageListener = event => {
      if (event.data && event.data.id === messageId) {
        clearTimeout(timeout);
        navigator.serviceWorker.removeEventListener('message', messageListener);
        resolve(event.data);
      }
    };

    // Adăugăm ascultătorul
    navigator.serviceWorker.addEventListener('message', messageListener);

    // Trimitem mesajul
    navigator.serviceWorker.controller.postMessage(message);
  });
}

// Funcție pentru a afișa o notificare prin Service Worker
function showNotificationViaSW(title, options = {}) {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    console.warn('Service Worker nu este disponibil pentru notificări');

    // Încercăm să arătăm notificarea direct dacă Service Worker nu e disponibil
    if (Notification.permission === 'granted') {
      return new Promise((resolve) => {
        const notification = new Notification(title, options);
        notification.onclick = () => resolve({ clicked: true });
        notification.onclose = () => resolve({ closed: true });
        notification.onerror = (err) => resolve({ error: err });
      });
    }

    return Promise.reject(new Error('Notificările nu sunt disponibile'));
  }

  return sendMessageToSW({
    type: 'SHOW_NOTIFICATION',
    payload: {
      title,
      ...options
    }
  });
}

// Înregistrează Service Worker-ul
registerServiceWorker();

// Expune funcțiile global pentru a fi folosite din alte părți ale aplicației
window.showNotificationViaSW = showNotificationViaSW;