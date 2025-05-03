/**
 * Script de testare pentru sistemul de rezumate de notificări (digest)
 * 
 * Acest script testează funcționalitatea de acumulare a notificărilor și trimitere
 * de rezumate periodice pentru email-uri blocate de rate limiting.
 */

import { EmailService } from './server/services/emailService.js';

// Funcție de așteptare
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testDigestSystem() {
  console.log('===== TESTARE SISTEM DIGEST NOTIFICĂRI =====');
  
  // Date pentru test
  const serviceProvider = {
    id: 999,
    email: 'test@example.com',
    companyName: 'Test Service Auto',
  };
  
  const client = {
    id: 1000,
    email: 'test-client@example.com',
    name: 'Client Test',
  };
  
  // Trimitem mai multe notificări într-un interval scurt pentru a declanșa rate limiting
  console.log('\n1. Trimitere notificări multiple pentru service provider...');
  
  console.log('→ Trimitem o notificare de cerere nouă...');
  await EmailService.sendNewRequestNotification(
    serviceProvider,
    'Reparație suspensie',
    'Ion Popescu',
    'request_1'
  );
  
  await wait(1000);
  
  console.log('→ Trimitem o notificare de mesaj nou...');
  await EmailService.sendNewMessageNotification(
    serviceProvider,
    'Bună ziua, doresc detalii suplimentare',
    'Ana Maria',
    'Reparație suspensie',
    'message_1'
  );
  
  await wait(1000);
  
  console.log('→ Trimitem o notificare de recenzie nouă...');
  await EmailService.sendNewReviewNotification(
    serviceProvider,
    'George Ionescu',
    4,
    'Servicii foarte bune, recomand!',
    'review_1'
  );
  
  console.log('\n2. Trimitere notificări multiple pentru client...');
  
  console.log('→ Trimitem o notificare de mesaj nou...');
  await EmailService.sendNewMessageNotificationToClient(
    client,
    'Vă mulțumim pentru solicitare! Când putem programa mașina?',
    'Service Auto Test',
    'Reparație suspensie',
    'message_client_1'
  );
  
  await wait(1000);
  
  console.log('→ Trimitem o notificare de ofertă nouă...');
  await EmailService.sendNewOfferNotificationToClient(
    client,
    'Ofertă reparație suspensie',
    'Service Auto Test',
    'Reparație suspensie',
    'offer_1'
  );
  
  console.log('\n3. Simulăm expirarea perioadei de rate limiting pentru a testa trimiterea digest...');
  console.log('Notă: În aplicația reală, acest lucru se întâmplă automat după 30 de minute');
  console.log('Pentru testare, puteți verifica în console.log-uri dacă notificările au fost adăugate în digest');

  console.log('\n===== TEST FINALIZAT =====');
  console.log('Verificați consolă pentru a vedea dacă notificările au fost adăugate corect în digest');
}

// Funcția principală
async function main() {
  try {
    await testDigestSystem();
  } catch (error) {
    console.error('Eroare în timpul testului:', error);
  }
}

// Rulăm testul
main();