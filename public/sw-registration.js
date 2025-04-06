// @ts-nocheck
// Service Worker Registration Script v1.3.0
// Acest script trebuie inclus în pagina HTML pentru a înregistra Service Worker-ul
// Versiunea actualizată include suport pentru sunete în notificări, gestionare mai bună a erorilor și autentificare

/**
 * Script pentru înregistrarea și gestionarea Service Worker-ului
 * Acest script trebuie inclus în pagina HTML principală
 */

// Verificăm dacă Service Worker este suportat
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('Încercăm înregistrarea Service Worker-ului...');

    // Înregistrăm Service Worker-ul cu un parametru de timestamp pentru forțarea actualizării
    const timestamp = new Date().getTime();
    const swVersion = '1.1.0'; // Incrementați versiunea la fiecare modificare importantă

    navigator.serviceWorker.register(`/sw.js?t=${timestamp}&v=${swVersion}`, { scope: '/' })
      .then((registration) => {
        console.log('Service Worker înregistrat cu succes:', registration);

        // Verificăm dacă există o actualizare disponibilă
        if (registration.waiting) {
          console.log('O nouă versiune a Service Worker-ului este disponibilă, se activează...');
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }

        // Ascultăm pentru actualizări
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('A fost găsită o nouă versiune a Service Worker-ului:', newWorker);

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Noua versiune este instalată, se activează...');

                // Forțăm activarea imediată
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('Eroare la înregistrarea Service Worker-ului:', error);
      });
  });

  // Ascultăm pentru controllerchange (când un nou Service Worker preia controlul)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Un nou Service Worker a preluat controlul, reîmprospătăm pagina pentru a asigura consistența...');

    // Reîmprospătăm pagina pentru a utiliza noua versiune
    // window.location.reload(); // Comentat pentru a evita reîmprospătarea inutilă în dezvoltare
  });
} else {
  console.warn('Acest browser nu suportă Service Workers');
}

/**
 * Verifică dacă browserul suportă notificări push
 * @returns {boolean} - true dacă browserul suportă notificări, false altfel
 */
function checkNotificationSupport() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Solicită permisiunea pentru notificări
 * @returns {Promise<string>} - Promise care se rezolvă cu starea permisiunii ('granted', 'denied', 'default')
 */
function requestNotificationPermission() {
  return Notification.requestPermission();
}

/**
 * Testează afișarea unei notificări
 * @returns {Promise<boolean>} - Promise care se rezolvă cu true dacă notificarea a fost afișată cu succes
 */
function testNotification() {
  return new Promise((resolve) => {
    if (!('Notification' in window)) {
      console.error('Acest browser nu suportă notificări');
      resolve(false);
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Permisiunea pentru notificări nu a fost acordată');
      resolve(false);
      return;
    }

    try {
      // Dacă avem un Service Worker activ, folosim-l pentru a afișa notificarea
      if (navigator.serviceWorker.controller) {
        // Generăm un ID unic pentru a identifica răspunsul
        const messageId = `test-${Date.now()}`;

        // Setăm un listener pentru răspuns
        const messageHandler = (event) => {
          if (event.data && event.data.id === messageId) {
            navigator.serviceWorker.removeEventListener('message', messageHandler);
            resolve(event.data.success === true);
          }
        };

        navigator.serviceWorker.addEventListener('message', messageHandler);

        // Trimitem cererea de notificare către Service Worker
        navigator.serviceWorker.controller.postMessage({
          type: 'TEST_NOTIFICATION',
          id: messageId,
          payload: {
            title: 'Test Notificare',
            body: 'Dacă vezi acest mesaj, notificările funcționează corect!',
            tag: 'test'
          }
        });

        // Setăm un timeout pentru a evita blocarea
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener('message', messageHandler);
          resolve(false);
        }, 3000);
      } else {
        // Fallback la notificări native dacă nu avem Service Worker
        const notification = new Notification('Test Notificare', {
          body: 'Dacă vezi acest mesaj, notificările funcționează corect!',
          icon: '/favicon.ico'
        });

        resolve(!!notification);
      }
    } catch (error) {
      console.error('Eroare la testarea notificării:', error);
      resolve(false);
    }
  });
}

// Expunem funcțiile pentru utilizare globală
window.swHelpers = {
  checkNotificationSupport,
  requestNotificationPermission,
  testNotification
};


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
 * Afișează o notificare folosind Service Worker-ul, cu opțiunea pentru sunet
 * @param {string} title - Titlul notificării
 * @param {Object} options - Opțiunile notificării
 * @param {boolean} [options.playSound=false] - Dacă să se redea un sunet la afișarea notificării
 * @param {string} [options.soundUrl='/notification-sound.mp3'] - URL-ul sunetului notificării
 * @returns {Promise} - Promisiune care se rezolvă când notificarea a fost afișată
 */
function showNotificationViaSW(title, options = {}) {
  // Dacă este disponibilă funcția globală, o folosim
  if (window.showNotificationViaSW) {
    // Dacă se dorește redarea unui sunet, pregătim audio
    if (options.playSound) {
      const soundUrl = options.soundUrl || '/sounds/notification.mp3';
      console.log('Folosesc sunet pentru notificare din:', soundUrl);

      // Ștergem opțiunile specifice de sunet din options înainte de a trimite la SW
      // și adăugăm datele despre sunet în data pentru a le trimite corect service worker-ului
      const { playSound, soundUrl: removedSoundUrl, ...cleanOptions } = options;

      // Asigurăm-ne că avem un obiect data pentru a putea adăuga informațiile despre sunet
      cleanOptions.data = cleanOptions.data || {};
      cleanOptions.data.shouldPlaySound = true;
      cleanOptions.data.soundUrl = soundUrl;

      // Promisiune pentru redarea sunetului
      const soundPromise = new Promise((resolve) => {
        try {
          const audio = new Audio(soundUrl);
          audio.volume = 0.5; // Volum moderat

          // Încercăm să redăm sunetul pe evenimentul de notificare
          audio.onended = () => resolve(true);
          audio.onerror = (e) => {
            console.warn('Eroare la redarea sunetului notificării:', e);
            resolve(false);
          };

          // Folosim metoda play() care returnează o promisiune
          const playPromise = audio.play();

          // Gestionăm promisiune (pentru browsere moderne)
          if (playPromise !== undefined) {
            playPromise
              .then(() => console.log('Sunet notificare redat cu succes'))
              .catch(error => {
                // Auto-play blocat sau altă eroare
                console.warn('Eroare la redarea sunetului (autoplay blocat?):', error);
                resolve(false);
              });
          }
        } catch (error) {
          console.error('Excepție la inițializarea sunetului notificării:', error);
          resolve(false);
        }
      });

      // Returnăm promisiunea pentru notificare, dar declanșăm și sunetul
      return Promise.all([
        window.showNotificationViaSW(title, cleanOptions),
        soundPromise
      ]).then(([notificationResult]) => notificationResult);
    }

    // Dacă nu este nevoie de sunet, doar afișăm notificarea
    return window.showNotificationViaSW(title, options);
  }

  // Implementare fallback dacă funcția globală nu este disponibilă
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
      // Pregătim sunetul dacă este necesar
      let audio;
      if (options.playSound) {
        try {
          const soundUrl = options.soundUrl || '/sounds/notification.mp3';
          console.log('Încercare redare sunet din fallback:', soundUrl);
          audio = new Audio(soundUrl);
          audio.volume = 0.5;
          audio.play().catch(e => console.warn('Eroare la redarea sunetului:', e));
        } catch (audioError) {
          console.warn('Nu s-a putut inițializa sunetul notificării:', audioError);
        }

        // Eliminăm proprietățile legate de sunet înainte de a crea notificarea
        const { playSound, soundUrl, ...cleanOptions } = options;
        options = cleanOptions;
      }

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
  console.log('stopBackgroundMessageCheck() - Oprire verificare mesaje în fundal');

  // Verificăm dacă există funcția în fereastra globală (setată de Service Worker)
  if (window.stopBackgroundMessageCheck) {
    // Aceasta este referința la funcția service worker definită anterior
    console.log('Folosim metoda stopBackgroundMessageCheck existentă');

    // Rulăm funcția internă care va comunica cu Service Worker-ul
    return window.stopBackgroundMessageCheck()
      .then(result => {
        console.log('Verificare mesaje în fundal oprită:', result);

        // Notificăm utilizatorul prin console
        console.log('%cVerificarea notificărilor a fost oprită cu succes', 'color: green; font-weight: bold');

        return result;
      })
      .catch(error => {
        console.error('Eroare la oprirea verificării mesajelor:', error);
        // Tratăm eșecul ca o reușită pentru utilizator
        return { success: true, message: 'Verificarea a fost oprită (cu avertismente)' };
      });
  }

  console.log('Nu există o funcție internă de oprire, nu este necesar să facem nimic');
  return Promise.resolve({ success: true, message: 'Nicio verificare activă de oprit' });
}

/**
 * Configurează ascultătorul pentru mesajele primite de la Service Worker
 * ATENȚIE: Funcția principală este acum implementată în index.html (setupAuthTokenListener)
 * pentru a evita duplicarea codului
 */
function setupServiceWorkerMessageListener() {
  console.log('[SW-Registration] Listener-ul pentru mesaje este gestionat acum de index.html');
  // Funcția goală rămâne pentru compatibilitate, implementarea reală este în index.html
}

// Înregistrăm Service Worker-ul - removed because the new registration logic replaces this.
//registerServiceWorker();

function checkPushSupport(registration) {
    if ('PushManager' in window) {
      console.log('Acest browser suportă notificări push');
      // Aici putem adăuga logica pentru a abona utilizatorul la notificări push
      // Exemplu: registration.pushManager.subscribe({...});
    } else {
      console.warn('Acest browser nu suportă notificări push');
    }
  }