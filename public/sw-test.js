/**
 * Script de test pentru verificarea Service Worker-ului
 */

// Funcție pentru a testa înregistrarea Service Worker-ului
function testServiceWorker() {
  if ('serviceWorker' in navigator) {
    console.log('Service Worker este suportat de browser');

    // Verificăm înregistrările existente
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log('Service Workers înregistrați:', registrations.length);

      registrations.forEach(registration => {
        console.log('SW înregistrat pentru scope:', registration.scope);
        console.log('SW stare:', registration.active ? 'activ' : (registration.installing ? 'în curs de instalare' : 'în așteptare'));

        // Verificăm versiunea service worker-ului
        if (registration.active) {
          // Trimitem un mesaj către Service Worker pentru a verifica starea
          registration.active.postMessage({
            type: 'TEST_STATUS',
            id: Date.now().toString(),
            payload: { testId: 'status-check' }
          });
        }
      });

      // Testăm o notificare
      if (Notification.permission === 'granted') {
        console.log('Trimitem o notificare de test...');

        // Verificăm dacă există un Service Worker activ
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'TEST_NOTIFICATION',
            id: Date.now().toString(),
            payload: {
              title: 'Test notificare din sw-test.js',
              body: 'Această notificare confirmă că Service Worker-ul funcționează corect',
              tag: 'test-notification-' + Date.now()
            }
          });
        } else {
          console.warn('Nu există un Service Worker care controlează această pagină');

          // Încercăm să afișăm notificarea direct
          try {
            new Notification('Test notificare directă', {
              body: 'Această notificare este afișată direct, fără Service Worker',
              icon: '/favicon.ico'
            });
          } catch (error) {
            console.error('Eroare la afișarea notificării directe:', error);
          }
        }
      } else {
        console.warn('Permisiunea de notificare nu este acordată:', Notification.permission);
      }
    });
  } else {
    console.error('Service Worker nu este suportat de acest browser');
  }
}

// Execută testul la încărcarea paginii
window.addEventListener('load', () => {
  console.log('Pagină încărcată, testăm Service Worker-ul...');
  setTimeout(testServiceWorker, 1000);
});

// Ascultăm răspunsurile de la Service Worker
navigator.serviceWorker.addEventListener('message', (event) => {
  console.log('Răspuns primit de la Service Worker:', event.data);
});


// Script de testare pentru Service Worker (revizuit)
document.addEventListener('DOMContentLoaded', function() {
  const swStatus = document.getElementById('swStatus');
  const registerButton = document.getElementById('registerSW');
  const unregisterButton = document.getElementById('unregisterSW');

  // Adăugăm butoane pentru testarea notificărilor
  const testNotificationButton = document.createElement('button');
  testNotificationButton.id = 'testNotification';
  testNotificationButton.textContent = 'Testează Notificare';
  document.querySelector('section').appendChild(testNotificationButton);

  const testBackgroundCheckButton = document.createElement('button');
  testBackgroundCheckButton.id = 'testBackgroundCheck';
  testBackgroundCheckButton.textContent = 'Testează Verificare Fundal';
  document.querySelector('section').appendChild(testBackgroundCheckButton);

  // Verifică dacă browserul suportă Service Workers
  if ('serviceWorker' in navigator) {
    //checkServiceWorkerStatus();  //Missing function
    registerButton.addEventListener('click', registerServiceWorker); //Missing function
    unregisterButton.addEventListener('click', unregisterServiceWorker); //Missing function
    testNotificationButton.addEventListener('click', testNotification); //Missing function
    testBackgroundCheckButton.addEventListener('click', testBackgroundCheck); //Missing function
  } else {
    swStatus.textContent = 'Service Workers nu sunt suportați de acest browser';
    swStatus.className = 'status error';
    registerButton.disabled = true;
    unregisterButton.disabled = true;
    testNotificationButton.disabled = true;
    testBackgroundCheckButton.disabled = true;
  }
});