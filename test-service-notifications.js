
/**
 * Script simplu pentru testarea directă a notificărilor prin email pentru service provider
 */

import { EmailService } from './emailService.js';

// Funcție pentru a aștepta un timp specificat
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('=== TEST DIRECT NOTIFICĂRI EMAIL PENTRU SERVICE PROVIDER ===\n');
  
  try {
    // Verificare API key Elastic Email
    console.log('Verificare configurare Elastic Email:');
    const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
    const fromEmail = EmailService.getFromEmail();
    
    console.log(`- Email expeditor: ${fromEmail}`);
    console.log('- API Key configurată:', !!apiKey);
    
    if (!apiKey) {
      console.error('❌ API KEY LIPSĂ - Serviciul de notificări email nu va funcționa!');
      process.exit(1);
    }
    
    // Adresa de email a furnizorului de servicii pentru test
    const serviceProviderEmail = process.argv[2];
    
    if (!serviceProviderEmail) {
      console.error('❌ Trebuie să specificați adresa de email a service provider-ului pentru testare!');
      console.log('Exemplu: node test-service-notifications.js "exemplu@email.com"');
      process.exit(1);
    }
    
    // Creare obiect de test pentru service provider
    const serviceProvider = {
      id: 999,
      companyName: 'Service Test',
      email: serviceProviderEmail
    };
    
    console.log(`\n📧 Test pentru service provider: ${serviceProvider.companyName} (${serviceProvider.email})`);
    
    // Test 1: Notificare cerere nouă
    console.log('\n📬 TEST 1: NOTIFICARE CERERE NOUĂ');
    const requestResult = await EmailService.sendNewRequestNotification(
      serviceProvider,
      'Revizie tehnică completă',
      'Client Test',
      `test_request_${Date.now()}`
    );
    console.log(`Rezultat test cerere nouă: ${requestResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    // Așteptăm 2 secunde între teste pentru a evita rate limiting sau alte probleme
    await wait(2000);
    
    // Test 2: Notificare mesaj nou
    console.log('\n📬 TEST 2: NOTIFICARE MESAJ NOU');
    const messageResult = await EmailService.sendNewMessageNotification(
      serviceProvider,
      'Acesta este un mesaj de test pentru verificarea notificărilor prin email. Vă rugăm să confirmați primirea.',
      'Client Test',
      'Cerere de testare a notificărilor',
      `test_message_${Date.now()}`
    );
    console.log(`Rezultat test mesaj nou: ${messageResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    // Așteptăm alte 2 secunde
    await wait(2000);
    
    // Test 3: Notificare ofertă acceptată
    console.log('\n📬 TEST 3: NOTIFICARE OFERTĂ ACCEPTATĂ');
    const offerResult = await EmailService.sendOfferAcceptedNotification(
      serviceProvider,
      'Reparație sistem frânare',
      'Client Test',
      `test_offer_${Date.now()}`
    );
    console.log(`Rezultat test ofertă acceptată: ${offerResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    // Așteptăm alte 2 secunde
    await wait(2000);
    
    // Test 4: Notificare recenzie nouă
    console.log('\n📬 TEST 4: NOTIFICARE RECENZIE NOUĂ');
    const reviewResult = await EmailService.sendNewReviewNotification(
      serviceProvider,
      'Client Test',
      5,
      'Servicii excelente, promptitudine și profesionalism. Recomand cu încredere!',
      `test_review_${Date.now()}`
    );
    console.log(`Rezultat test recenzie nouă: ${reviewResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    console.log('\n✅ Teste finalizate! Verificați inbox-ul pentru emailurile primite.');
    
  } catch (error) {
    console.error('\n❌ Eroare în timpul testării:', error);
  }
}

main();
