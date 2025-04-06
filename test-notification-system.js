/**
 * Script de testare pentru sistemul de notificări al aplicației Auto Service App
 * Verifică trimiterea de notificări email pentru toate tipurile de evenimente:
 * - Cereri noi
 * - Oferte acceptate
 * - Mesaje noi
 * - Recenzii noi
 * 
 * Acest script verifică:
 * 1. Configurația corectă a API-ului de email
 * 2. Preferințele de notificare ale service provider-ilor
 * 3. Capacitatea de a trimite email-uri de notificare pentru toate tipurile de evenimente
 * 4. Compatibilitatea cu baza de date
 */

import { EmailService } from './server/services/emailService.ts';
import pg from 'pg';
const { Pool } = pg;

async function main() {
  console.log('====================================================');
  console.log('=== TEST SISTEM NOTIFICĂRI PENTRU SERVICE PROVIDERS ===');
  console.log('====================================================\n');
  
  try {
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
    
    // Obține toți service providers din baza de date
    console.log('\n👨‍🔧 Obținere lista service providers...');
    const spResult = await pool.query('SELECT * FROM service_providers');
    
    if (spResult.rows.length === 0) {
      console.error('❌ Nu există service providers în baza de date!');
      process.exit(1);
    }
    
    console.log(`✅ Am găsit ${spResult.rows.length} service providers.`);
    
    // Testare notificări pentru primul service provider
    const serviceProvider = spResult.rows[0];
    console.log(`\n🔍 Test notificări pentru service provider: ${serviceProvider.company_name} (${serviceProvider.email})`);
    
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
    }
    
    // Obținem sau creăm date necesare pentru teste (cerere și ofertă)
    console.log('\n📋 Pregătire date pentru teste...');
    
    // 1. Obține/creează o cerere
    console.log('Căutare cereri existente...');
    const requestResult = await pool.query(
      'SELECT * FROM requests WHERE client_id = $1 LIMIT 1',
      [client.id]
    );
    
    let requestId;
    let requestTitle;
    
    if (requestResult.rows.length > 0) {
      const request = requestResult.rows[0];
      requestId = request.id;
      requestTitle = request.title;
      console.log(`✅ Cerere existentă găsită: "${requestTitle}" (ID: ${requestId})`);
    } else {
      console.log('Creare cerere de test...');
      const newRequestResult = await pool.query(
        'INSERT INTO requests (client_id, title, description, car_id, status, county, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, title',
        [client.id, 'Cerere test pentru notificări', 'Aceasta este o cerere creată automat pentru testarea notificărilor', null, 'Activă', 'București', new Date()]
      );
      requestId = newRequestResult.rows[0].id;
      requestTitle = newRequestResult.rows[0].title;
      console.log(`✅ Cerere nouă creată: "${requestTitle}" (ID: ${requestId})`);
    }
    
    // 2. Obține/creează o ofertă
    console.log('Căutare oferte existente...');
    const offerResult = await pool.query(
      'SELECT * FROM sent_offers WHERE service_provider_id = $1 AND request_id = $2 LIMIT 1',
      [serviceProvider.id, requestId]
    );
    
    let offerId;
    let offerTitle = "Ofertă test pentru notificări";
    
    if (offerResult.rows.length > 0) {
      const offer = offerResult.rows[0];
      offerId = offer.id;
      console.log(`✅ Ofertă existentă găsită (ID: ${offerId})`);
    } else {
      console.log('Creare ofertă de test...');
      try {
        // Obținem informații suplimentare despre cerere și client
        const requestDetails = await pool.query(
          'SELECT r.*, c.name as client_name FROM requests r JOIN clients c ON r.client_id = c.id WHERE r.id = $1',
          [requestId]
        );
        
        const request = requestDetails.rows[0];
        
        const newOfferResult = await pool.query(
          `INSERT INTO sent_offers (
            service_provider_id, request_id, price, details, status, created_at,
            title, request_user_id, request_user_name, available_dates
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [
            serviceProvider.id,
            requestId,
            500,
            'Ofertă de test pentru notificări',
            'Trimisă',
            new Date(),
            offerTitle,
            request.client_id,
            request.client_name,
            '{2025-05-01}' // Array cu o dată disponibilă
          ]
        );
        
        offerId = newOfferResult.rows[0].id;
        console.log(`✅ Ofertă nouă creată (ID: ${offerId})`);
      } catch (offerError) {
        console.error('❌ Eroare la crearea ofertei:', offerError.message);
        console.log('Continuăm testele fără ofertă...');
      }
    }
    
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
        offerTitle,
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
      // Creare mesaj în baza de date
      const messageContent = "Acesta este un mesaj de test pentru verificarea notificărilor prin email.";
      
      try {
        const messageResult = await pool.query(
          'INSERT INTO messages (request_id, sender_id, sender_role, receiver_id, receiver_role, content, is_read, is_new, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
          [requestId, client.id, 'client', serviceProvider.id, 'service', messageContent, false, true, new Date()]
        );
        
        const messageId = messageResult.rows[0].id;
        console.log(`✅ Mesaj creat cu succes în baza de date (ID: ${messageId})`);
        
        // Trimite notificare
        const emailResult = await EmailService.sendNewMessageNotification(
          adaptedServiceProvider,
          messageContent,
          client.name,
          requestTitle,
          `test_message_${messageId}_${Date.now()}`
        );
        
        results.newMessage = emailResult;
        console.log(`Rezultat test mesaj nou: ${emailResult ? '✅ SUCCES' : '❌ EȘEC'}`);
      } catch (messageError) {
        console.error('❌ Eroare la crearea mesajului:', messageError.message);
        console.log('Continuăm testele fără mesaj...');
      }
    } else {
      console.log('ℹ️ Test omis: notificările pentru mesaje noi sunt dezactivate în preferințele utilizatorului.');
    }
    
    // 4. Test notificare recenzie nouă
    console.log('\n📬 TEST 4: NOTIFICARE RECENZIE NOUĂ');
    if (prefs.email_notifications_enabled && prefs.new_review_email_enabled) {
      const reviewText = "Servicii excelente, promptitudine și profesionalism. Recomand cu încredere!";
      const reviewRating = 5;
      
      // Creare recenzie în baza de date (opțional, dacă avem tabel pentru recenzii)
      try {
        // Nu facem INSERT în baza de date pentru recenzie, doar simulăm notificarea
        const reviewResult = await EmailService.sendNewReviewNotification(
          adaptedServiceProvider,
          client.name,
          reviewRating,
          reviewText,
          `test_review_${Date.now()}`
        );
        
        results.newReview = reviewResult;
        console.log(`Rezultat test recenzie nouă: ${reviewResult ? '✅ SUCCES' : '❌ EȘEC'}`);
      } catch (reviewError) {
        console.error('❌ Eroare la notificarea recenziei:', reviewError.message);
      }
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
      console.log('Sistemul de notificări prin email funcționează corect.');
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