/**
 * Test direct pentru notificări prin email - Versiunea 2
 * O versiune simplificată care nu încearcă să acceseze schema TypeScript
 * 
 * Script simplu pentru testarea notificărilor prin email, fără a folosi module TypeScript
 */

import { EmailService } from './emailService.js';
import pg from 'pg';
const { Pool } = pg;

async function main() {
  console.log('=== TEST DIRECT NOTIFICĂRI EMAIL V2 ===');
  console.log('Testăm notificările prin email fără a folosi schema TypeScript\n');

  try {
    // Verifică API key Elastic Email
    console.log('Verificare configurare Elastic Email:');
    const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
    const fromEmail = EmailService.getFromEmail();
    const fromName = EmailService.getFromName();
    const baseUrl = EmailService.getBaseUrl();
    
    console.log(`- API URL: ${baseUrl}`);
    console.log(`- Email expeditor: ${fromEmail}`);
    console.log(`- Nume expeditor: ${fromName}`);
    console.log('- API Key configurată:', !!apiKey);
    if (apiKey) {
      console.log(`- API Key primele/ultimele caractere: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    } else {
      console.error('❗ API KEY LIPSĂ - Serviciul de notificări email nu va funcționa!');
      process.exit(1);
    }
    
    // Conectare la baza de date pentru a obține date reale
    console.log('\nConectare la baza de date...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Obține toți service providers din baza de date
    console.log('\nObținere date service provider:');
    const result = await pool.query('SELECT * FROM service_providers WHERE id = 1');
    
    if (result.rows.length === 0) {
      console.error('❗ Service provider cu ID 1 nu a fost găsit în baza de date');
      return;
    }
    
    const serviceProviderData = result.rows[0];
    console.log(`- Găsit service provider ID ${serviceProviderData.id}: ${serviceProviderData.company_name}`);
    console.log(`- Email: ${serviceProviderData.email}`);
    
    // Creăm un obiect service provider adaptat pentru EmailService
    const serviceProvider = {
      id: serviceProviderData.id,
      companyName: serviceProviderData.company_name,
      email: serviceProviderData.email,
      phone: serviceProviderData.phone
    };
    
    // Testăm notificarea pentru o cerere nouă
    console.log('\n📧 Test notificare CERERE NOUĂ...');
    const requestTitle = 'Test Reparație frâne';
    const clientName = 'Client Test Automat';
    const requestResult = await EmailService.sendNewRequestNotification(
      serviceProvider,
      requestTitle,
      clientName,
      `test_request_${Date.now()}`
    );
    console.log(`Rezultat: ${requestResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    // Testăm notificarea pentru o ofertă acceptată
    console.log('\n📧 Test notificare OFERTĂ ACCEPTATĂ...');
    const offerTitle = 'Test Schimb plăcuțe frână';
    const offerResult = await EmailService.sendOfferAcceptedNotification(
      serviceProvider,
      offerTitle,
      clientName,
      `test_offer_${Date.now()}`
    );
    console.log(`Rezultat: ${offerResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    // Testăm notificarea pentru un mesaj nou
    console.log('\n📧 Test notificare MESAJ NOU...');
    const messageContent = 'Acesta este un mesaj de test pentru verificarea notificărilor prin email. Vă mulțumim pentru colaborare!';
    const messageResult = await EmailService.sendNewMessageNotification(
      serviceProvider,
      messageContent,
      clientName,
      requestTitle,
      `test_message_${Date.now()}`
    );
    console.log(`Rezultat: ${messageResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    // Testăm notificarea pentru o recenzie nouă
    console.log('\n📧 Test notificare RECENZIE NOUĂ...');
    const reviewContent = 'Servicii excelente, promptitudine și profesionalism. Recomand cu încredere!';
    const rating = 5;
    const reviewResult = await EmailService.sendNewReviewNotification(
      serviceProvider,
      clientName,
      rating,
      reviewContent,
      `test_review_${Date.now()}`
    );
    console.log(`Rezultat: ${reviewResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    // Sumar teste
    console.log('\n=== SUMAR TESTE ===');
    console.log(`Cerere nouă: ${requestResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    console.log(`Ofertă acceptată: ${offerResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    console.log(`Mesaj nou: ${messageResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    console.log(`Recenzie nouă: ${reviewResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    const totalSuccessful = [requestResult, offerResult, messageResult, reviewResult].filter(Boolean).length;
    console.log(`\nRezultat global: ${totalSuccessful}/4 teste reușite`);
    
    // Închide conexiunea la baza de date
    await pool.end();
    
  } catch (error) {
    console.error('❌ EROARE ÎN TIMPUL TESTĂRII:', error);
    process.exit(1);
  }
  
  console.log('\n=== TEST COMPLET ===');
}

main().catch(console.error);