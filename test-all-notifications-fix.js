
/**
 * Script de testare pentru sistemul de notificări prin email - VERSIUNE CORECTATĂ
 * 
 * Acest script testează toate tipurile de notificări după corectarea problemelor
 * cu întreruptoarea automată.
 */

import { EmailService } from './emailService.js';

// Funcție helper pentru așteptare între test
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== TEST COMPLET NOTIFICĂRI EMAIL (VERSIUNE CORECTATĂ) ===\n');
  
  try {
    // Verificare API key Elastic Email
    console.log('Verificare configurare Elastic Email:');
    const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
    
    if (!apiKey) {
      console.error('❌ API KEY LIPSĂ - Serviciul de notificări email nu va funcționa!');
      process.exit(1);
    }
    
    // Adresa de email pentru test
    const serviceProviderEmail = process.argv[2];
    
    if (!serviceProviderEmail) {
      console.error('❌ Trebuie să specificați adresa de email pentru testare!');
      console.log('Exemplu: node test-all-notifications-fix.js "exemplu@email.com"');
      process.exit(1);
    }
    
    // Testăm cu diferite formate pentru a verifica robustețea
    const testCases = [
      // Formatul standard
      {
        name: "Format standard",
        provider: {
          id: 999,
          companyName: "Service Test Standard",
          email: serviceProviderEmail
        }
      },
      // Format din baza de date SQL (snake_case)
      {
        name: "Format din baza de date SQL",
        provider: {
          id: 998,
          company_name: "Service Test SQL Format",
          email: serviceProviderEmail
        }
      },
      // Format minim
      {
        name: "Format minim",
        provider: {
          email: serviceProviderEmail
        }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n\n🧪 TESTARE CU ${testCase.name} 🧪`);
      const serviceProvider = testCase.provider;
      
      // Test 1: Notificare cerere nouă
      console.log('\n📬 TEST 1: NOTIFICARE CERERE NOUĂ');
      const requestResult = await EmailService.sendNewRequestNotification(
        serviceProvider,
        'Revizie tehnică completă',
        'Client Test',
        `test_request_${Date.now()}`
      );
      console.log(`Rezultat test cerere nouă: ${requestResult ? '✅ SUCCES' : '❌ EȘEC'}`);
      
      // Așteptăm 2 secunde între teste
      await wait(2000);
      
      // Test 2: Notificare mesaj nou
      console.log('\n📬 TEST 2: NOTIFICARE MESAJ NOU');
      const messageResult = await EmailService.sendNewMessageNotification(
        serviceProvider,
        'Acesta este un mesaj de test pentru verificarea notificărilor prin email după corectarea problemelor.',
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
      
      console.log(`\n✅ Teste complete pentru ${testCase.name}`);
    }
    
    console.log('\n✅ Toate testele au fost efectuate!');
    
  } catch (error) {
    console.error('❌ Eroare în timpul testelor:', error);
    if (error instanceof Error) {
      console.error('  Mesaj:', error.message);
      console.error('  Stack:', error.stack);
    }
  }
}

main().catch(error => {
  console.error('Eroare fatală:', error);
  process.exit(1);
});
