// Service Worker Registration Script v1.1.0
// Acest script trebuie inclus în pagina HTML pentru a înregistra Service Worker-ul
// Versiunea actualizată include suport pentru sunete în notificări și gestionare mai bună a erorilor

/**
 * Înregistrează Service Worker-ul pentru aplicație
 * Versiunea actuală: 1.1.0
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
  if (window.stopBackgroundMessageCheck) {
    return window.stopBackgroundMessageCheck();
  }
  
  return Promise.resolve(); // Nu există funcția, deci nu avem ce opri
}

// Înregistrăm Service Worker-ul
registerServiceWorker();