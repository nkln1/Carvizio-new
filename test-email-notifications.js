/**
 * Script de testare pentru sistemul de notificări prin email pentru service providers
 * 
 * Verifică toate tipurile de notificări: cereri noi, oferte acceptate, mesaje noi, recenzii noi
 */

// Import direct pentru fișierul TypeScript
import { EmailService } from './server/services/emailService.ts';
import pg from 'pg';
const { Pool } = pg;

async function main() {
  console.log('=== TEST NOTIFICĂRI EMAIL PENTRU SERVICE PROVIDERS ===\n');
  
  try {
    // Verificare API key Elastic Email
    console.log('Verificare configurare Elastic Email:');
    const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
    const fromEmail = EmailService.getFromEmail();
    const baseUrl = EmailService.getBaseUrl();
    
    console.log(`- API URL: ${baseUrl}`);
    console.log(`- Email expeditor: ${fromEmail}`);
    console.log('- API Key configurată:', !!apiKey);
    if (apiKey) {
      console.log(`- API Key (primele/ultimele caractere): ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    } else {
      console.error('❗ API KEY LIPSĂ - Serviciul de notificări email nu va funcționa!');
      process.exit(1);
    }
    
    // Conectare la baza de date
    console.log('\nConectare la baza de date...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Obține toți service providers din baza de date
    console.log('\nObținere lista service providers...');
    const spResult = await pool.query('SELECT * FROM service_providers');
    
    if (spResult.rows.length === 0) {
      console.error('Nu există service providers în baza de date!');
      process.exit(1);
    }
    
    console.log(`Am găsit ${spResult.rows.length} service providers.`);
    
    // Testare notificări pentru primul service provider
    const serviceProvider = spResult.rows[0];
    console.log(`\nTest notificări pentru service provider: ${serviceProvider.company_name} (${serviceProvider.email})`);
    
    // Adaptăm obiectul pentru a corespunde așteptărilor EmailService
    const adaptedServiceProvider = {
      id: serviceProvider.id,
      companyName: serviceProvider.company_name,
      email: serviceProvider.email,
      phone: serviceProvider.phone
    };
    
    // Obține preferințele de notificare
    console.log('\nVerificare preferințe notificări...');
    const prefsResult = await pool.query(
      'SELECT * FROM notification_preferences WHERE service_provider_id = $1',
      [serviceProvider.id]
    );
    
    let hasPreferences = prefsResult.rows.length > 0;
    
    if (hasPreferences) {
      const prefs = prefsResult.rows[0];
      console.log('Preferințe notificări:');
      console.log(`- Email notificări activate: ${prefs.email_notifications_enabled ? 'DA' : 'NU'}`);
      console.log(`- Cereri noi: ${prefs.new_request_email_enabled ? 'DA' : 'NU'}`);
      console.log(`- Oferte acceptate: ${prefs.accepted_offer_email_enabled ? 'DA' : 'NU'}`);
      console.log(`- Mesaje noi: ${prefs.new_message_email_enabled ? 'DA' : 'NU'}`);
      console.log(`- Recenzii noi: ${prefs.new_review_email_enabled ? 'DA' : 'NU'}`);
    } else {
      console.log('Nu există preferințe setate. Se vor folosi valorile implicite (toate notificările activate).');
    }
    
    // Test pentru toate tipurile de notificări
    console.log('\n=== TESTARE EMAIL PENTRU CERERE NOUĂ ===');
    const requestResult = await EmailService.sendNewRequestNotification(
      adaptedServiceProvider,
      'Reparație sistem frânare',
      'Client Test',
      'test_request_' + Date.now()
    );
    console.log(`Rezultat test cerere nouă: ${requestResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    console.log('\n=== TESTARE EMAIL PENTRU OFERTĂ ACCEPTATĂ ===');
    const offerResult = await EmailService.sendOfferAcceptedNotification(
      adaptedServiceProvider,
      'Schimb placuțe frână',
      'Client Test',
      'test_offer_' + Date.now()
    );
    console.log(`Rezultat test ofertă acceptată: ${offerResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    console.log('\n=== TESTARE EMAIL PENTRU MESAJ NOU ===');
    const messageResult = await EmailService.sendNewMessageNotification(
      adaptedServiceProvider,
      'Bună ziua, aș dori să știu dacă aveți disponibilitate pentru repararea mașinii mele săptămâna viitoare. Mulțumesc!',
      'Client Test',
      'Reparație sistem frânare',
      'test_message_' + Date.now()
    );
    console.log(`Rezultat test mesaj nou: ${messageResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    console.log('\n=== TESTARE EMAIL PENTRU RECENZIE NOUĂ ===');
    const reviewResult = await EmailService.sendNewReviewNotification(
      adaptedServiceProvider,
      'Client Test',
      5,
      'Servicii excelente, promptitudine și profesionalism. Recomand cu încredere!',
      'test_review_' + Date.now()
    );
    console.log(`Rezultat test recenzie nouă: ${reviewResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    console.log('\n=== REZULTATE TESTE ===');
    console.log(`Cerere nouă: ${requestResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    console.log(`Ofertă acceptată: ${offerResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    console.log(`Mesaj nou: ${messageResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    console.log(`Recenzie nouă: ${reviewResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    console.log('\nTestarea notificărilor prin email s-a încheiat.');
    
    // Închide conexiunea la baza de date
    await pool.end();
    
  } catch (error) {
    console.error('Eroare în timpul testării:', error);
    process.exit(1);
  }
}

main().catch(console.error);