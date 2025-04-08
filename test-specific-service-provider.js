/**
 * Script de testare pentru verificarea notificărilor pentru un furnizor de servicii specific
 * Acest script permite testarea unui provider specific prin email sau ID
 */

import { EmailService } from './server/services/emailService.ts';
import pg from 'pg';
const { Pool } = pg;

async function main() {
  console.log('====================================================');
  console.log('=== TEST NOTIFICĂRI PENTRU UN SERVICE PROVIDER SPECIFIC ===');
  console.log('====================================================\n');
  
  try {
    // Email-ul sau ID-ul serviciului care are probleme
    const targetEmail = process.argv[2]; // Se poate specifica email-ul ca primul argument la rulare
    const targetId = process.argv[3] ? parseInt(process.argv[3]) : null; // Se poate specifica ID-ul ca al doilea argument la rulare
    
    if (!targetEmail && !targetId) {
      console.error('❌ Trebuie să specificați adresa de email sau ID-ul service provider-ului pentru testare!');
      console.log('Exemplu: node test-specific-service-provider.js "exemplu@email.com"');
      console.log('sau: node test-specific-service-provider.js "" 15');
      process.exit(1);
    }
    
    // Verificare API key Elastic Email
    console.log('🔑 Verificare configurare Elastic Email:');
    const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
    const fromEmail = EmailService.getFromEmail();
    const baseUrl = EmailService.getBaseUrl();
    
    console.log(`- API URL: ${baseUrl}`);
    console.log(`- Email expeditor: ${fromEmail}`);
    console.log('- API Key configurată:', !!apiKey);
    if (apiKey) {
      console.log(`- API Key (primele/ultimele caractere): ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    } else {
      console.error('❌ API KEY LIPSĂ - Serviciul de notificări email nu va funcționa!');
      process.exit(1);
    }
    
    // Conectare la baza de date
    console.log('\n🔌 Conectare la baza de date...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Obține service provider-ul specific
    console.log(`\n👨‍🔧 Obținere informații pentru service provider specific...`);
    
    let query = 'SELECT * FROM service_providers WHERE ';
    let params = [];
    
    if (targetEmail) {
      query += 'email = $1';
      params.push(targetEmail);
      console.log(`Căutare după email: ${targetEmail}`);
    } else {
      query += 'id = $1';
      params.push(targetId);
      console.log(`Căutare după ID: ${targetId}`);
    }
    
    const spResult = await pool.query(query, params);
    
    if (spResult.rows.length === 0) {
      console.error(`❌ Nu s-a găsit niciun service provider cu ${targetEmail ? 'email-ul ' + targetEmail : 'ID-ul ' + targetId} în baza de date!`);
      process.exit(1);
    }
    
    const serviceProvider = spResult.rows[0];
    console.log(`✅ Service provider găsit: ${serviceProvider.company_name} (${serviceProvider.email}, ID: ${serviceProvider.id})`);
    
    // Adaptăm obiectul pentru a corespunde așteptărilor EmailService
    const adaptedServiceProvider = {
      id: serviceProvider.id,
      companyName: serviceProvider.company_name,
      email: serviceProvider.email,
      phone: serviceProvider.phone
    };
    
    // Obține un client din baza de date pentru teste
    console.log('\n👤 Obținere client pentru testare...');
    const clientResult = await pool.query('SELECT * FROM clients LIMIT 1');
    
    if (clientResult.rows.length === 0) {
      console.error('❌ Nu există clienți în baza de date!');
      process.exit(1);
    }
    
    const client = clientResult.rows[0];
    console.log(`✅ Client pentru teste: ${client.name} (${client.email})`);
    
    // Obține preferințele de notificare
    console.log('\n⚙️ Verificare preferințe notificări...');
    const prefsResult = await pool.query(
      'SELECT * FROM notification_preferences WHERE service_provider_id = $1',
      [serviceProvider.id]
    );
    
    let hasPreferences = prefsResult.rows.length > 0;
    let prefs = {
      email_notifications_enabled: true,
      new_request_email_enabled: true,
      accepted_offer_email_enabled: true,
      new_message_email_enabled: true,
      new_review_email_enabled: true
    };
    
    if (hasPreferences) {
      prefs = prefsResult.rows[0];
      console.log('Preferințe notificări găsite:');
      console.log(`- Email notificări activate: ${prefs.email_notifications_enabled ? '✅ DA' : '❌ NU'}`);
      console.log(`- Cereri noi: ${prefs.new_request_email_enabled ? '✅ DA' : '❌ NU'}`);
      console.log(`- Oferte acceptate: ${prefs.accepted_offer_email_enabled ? '✅ DA' : '❌ NU'}`);
      console.log(`- Mesaje noi: ${prefs.new_message_email_enabled ? '✅ DA' : '❌ NU'}`);
      console.log(`- Recenzii noi: ${prefs.new_review_email_enabled ? '✅ DA' : '❌ NU'}`);
    } else {
      console.log('ℹ️ Nu există preferințe setate. Se vor folosi valorile implicite (toate notificările activate).');
      
      // Creăm preferințe implicite pentru acest service provider
      console.log('Creăm preferințe implicite pentru service provider...');
      try {
        await pool.query(
          `INSERT INTO notification_preferences 
           (service_provider_id, email_notifications_enabled, new_request_email_enabled, 
            accepted_offer_email_enabled, new_message_email_enabled, new_review_email_enabled, 
            browser_notifications_enabled, new_request_browser_enabled, accepted_offer_browser_enabled, 
            new_message_browser_enabled, new_review_browser_enabled, browser_permission, created_at, updated_at) 
           VALUES ($1, true, true, true, true, true, true, true, true, true, true, false, NOW(), NOW())`,
          [serviceProvider.id]
        );
        console.log('✅ Preferințe implicite create cu succes!');
      } catch (prefError) {
        console.error('❌ Eroare la crearea preferințelor implicite:', prefError.message);
      }
    }

    // Test pentru toate tipurile de notificări
    console.log('\n📧 Începere teste pentru toate tipurile de notificări...');
    
    // Test pentru toate tipurile de notificări
    const results = {
      newRequest: false,
      acceptedOffer: false,
      newMessage: false,
      newReview: false
    };
    
    // 1. Test notificare cerere nouă
    console.log('\n📬 TEST 1: NOTIFICARE CERERE NOUĂ');
    if (prefs.email_notifications_enabled && prefs.new_request_email_enabled) {
      const requestResult = await EmailService.sendNewRequestNotification(
        adaptedServiceProvider,
        'Reparație sistem frânare',
        client.name,
        `test_request_${Date.now()}`
      );
      results.newRequest = requestResult;
      console.log(`Rezultat test cerere nouă: ${requestResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    } else {
      console.log('ℹ️ Test omis: notificările pentru cereri noi sunt dezactivate în preferințele utilizatorului.');
    }
    
    // 2. Test notificare ofertă acceptată
    console.log('\n📬 TEST 2: NOTIFICARE OFERTĂ ACCEPTATĂ');
    if (prefs.email_notifications_enabled && prefs.accepted_offer_email_enabled) {
      const offerResult = await EmailService.sendOfferAcceptedNotification(
        adaptedServiceProvider,
        'Revizie completă auto',
        client.name,
        `test_offer_${Date.now()}`
      );
      results.acceptedOffer = offerResult;
      console.log(`Rezultat test ofertă acceptată: ${offerResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    } else {
      console.log('ℹ️ Test omis: notificările pentru oferte acceptate sunt dezactivate în preferințele utilizatorului.');
    }
    
    // 3. Test notificare mesaj nou
    console.log('\n📬 TEST 3: NOTIFICARE MESAJ NOU');
    if (prefs.email_notifications_enabled && prefs.new_message_email_enabled) {
      const messageContent = "Acesta este un mesaj de test pentru verificarea notificărilor prin email. Vă rugăm să confirmați primirea.";
      
      const messageResult = await EmailService.sendNewMessageNotification(
        adaptedServiceProvider,
        messageContent,
        client.name,
        'Cerere de testare a notificărilor',
        `test_message_${Date.now()}`
      );
      
      results.newMessage = messageResult;
      console.log(`Rezultat test mesaj nou: ${messageResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    } else {
      console.log('ℹ️ Test omis: notificările pentru mesaje noi sunt dezactivate în preferințele utilizatorului.');
    }
    
    // 4. Test notificare recenzie nouă
    console.log('\n📬 TEST 4: NOTIFICARE RECENZIE NOUĂ');
    if (prefs.email_notifications_enabled && prefs.new_review_email_enabled) {
      const reviewText = "Servicii excelente, promptitudine și profesionalism. Recomand cu încredere!";
      const reviewRating = 5;
      
      const reviewResult = await EmailService.sendNewReviewNotification(
        adaptedServiceProvider,
        client.name,
        reviewRating,
        reviewText,
        `test_review_${Date.now()}`
      );
      
      results.newReview = reviewResult;
      console.log(`Rezultat test recenzie nouă: ${reviewResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    } else {
      console.log('ℹ️ Test omis: notificările pentru recenzii noi sunt dezactivate în preferințele utilizatorului.');
    }
    
    // Rezultate finale
    console.log('\n📊 REZULTATE FINALE');
    console.log('====================================================');
    console.log(`Cerere nouă: ${results.newRequest ? '✅ SUCCES' : prefs.new_request_email_enabled ? '❌ EȘEC' : '⏩ OMIS'}`);
    console.log(`Ofertă acceptată: ${results.acceptedOffer ? '✅ SUCCES' : prefs.accepted_offer_email_enabled ? '❌ EȘEC' : '⏩ OMIS'}`);
    console.log(`Mesaj nou: ${results.newMessage ? '✅ SUCCES' : prefs.new_message_email_enabled ? '❌ EȘEC' : '⏩ OMIS'}`);
    console.log(`Recenzie nouă: ${results.newReview ? '✅ SUCCES' : prefs.new_review_email_enabled ? '❌ EȘEC' : '⏩ OMIS'}`);
    console.log('====================================================');
    
    const allSuccess = 
      (results.newRequest || !prefs.new_request_email_enabled) && 
      (results.acceptedOffer || !prefs.accepted_offer_email_enabled) && 
      (results.newMessage || !prefs.new_message_email_enabled) && 
      (results.newReview || !prefs.new_review_email_enabled);
    
    if (allSuccess) {
      console.log('✅ TOATE TESTELE AU FOST TRECUTE CU SUCCES!');
      console.log('Sistemul de notificări prin email funcționează corect pentru acest service provider.');
    } else {
      console.log('❌ UNELE TESTE AU EȘUAT!');
      console.log('Verificați erorile de mai sus și corectați problemele.');
    }
    
    // Închide conexiunea la baza de date
    await pool.end();
    
  } catch (error) {
    console.error('❌ EROARE GENERALĂ:', error);
    process.exit(1);
  }
}

main().catch(console.error);