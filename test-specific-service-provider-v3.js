/**
 * Script de testare pentru verificarea notificărilor pentru un furnizor de servicii specific
 * Versiunea 3.0 - Suport îmbunătățit pentru verificare preferințe și email-uri
 */

import { EmailService } from './emailService.js';
import pg from 'pg';
const { Pool } = pg;

async function sendEmail(to, subject, htmlContent, textContent, messageId) {
  // Folosim direct implementarea din EmailService
  return EmailService.sendEmail(to, subject, htmlContent, textContent, messageId);
}

async function sendNewRequestNotification(email, companyName, requestTitle, clientName, messageId) {
  // Construim un obiect service provider minim
  const serviceProvider = {
    email,
    companyName
  };
  
  return EmailService.sendNewRequestNotification(
    serviceProvider, 
    requestTitle, 
    clientName, 
    messageId,
    'Test direct din test-specific-service-provider-v3.js'
  );
}

async function sendOfferAcceptedNotification(email, companyName, offerTitle, clientName, messageId) {
  // Construim un obiect service provider minim
  const serviceProvider = {
    email,
    companyName
  };
  
  return EmailService.sendOfferAcceptedNotification(
    serviceProvider, 
    offerTitle, 
    clientName, 
    messageId,
    'Test direct din test-specific-service-provider-v3.js'
  );
}

async function sendNewMessageNotification(email, companyName, messageContent, senderName, requestOrOfferTitle, messageId) {
  // Construim un obiect service provider minim
  const serviceProvider = {
    email,
    companyName
  };
  
  return EmailService.sendNewMessageNotification(
    serviceProvider, 
    messageContent,
    senderName,
    requestOrOfferTitle,
    messageId,
    'Test direct din test-specific-service-provider-v3.js'
  );
}

async function sendNewReviewNotification(email, companyName, clientName, rating, reviewContent, messageId) {
  // Construim un obiect service provider minim
  const serviceProvider = {
    email,
    companyName
  };
  
  return EmailService.sendNewReviewNotification(
    serviceProvider, 
    clientName,
    rating,
    reviewContent,
    messageId,
    'Test direct din test-specific-service-provider-v3.js'
  );
}

async function main() {
  try {
    console.log('=== TEST NOTIFICĂRI PENTRU SERVICE PROVIDER SPECIFIC V3 ===');
    
    // ID-ul furnizorului de servicii de testat
    const serviceProviderId = 1;
    
    // Conectare la baza de date
    console.log('\nConectare la baza de date...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Obținem datele furnizorului de servicii
    console.log(`\nObținere date pentru service provider ID ${serviceProviderId}...`);
    const result = await pool.query(`
      SELECT sp.*, np.* 
      FROM service_providers sp
      LEFT JOIN notification_preferences np ON sp.id = np.service_provider_id
      WHERE sp.id = $1
    `, [serviceProviderId]);
    
    if (result.rows.length === 0) {
      console.error(`❌ Nu s-a găsit service provider-ul cu ID ${serviceProviderId}`);
      return;
    }
    
    const spData = result.rows[0];
    
    // Afișăm datele service provider-ului
    console.log(`✅ Găsit service provider:`);
    console.log(`- ID: ${spData.id}`);
    console.log(`- Nume: ${spData.company_name}`);
    console.log(`- Email: ${spData.email}`);
    console.log(`- Telefon: ${spData.phone}`);
    
    // Verificăm preferințele de notificare
    const emailNotificationsEnabled = spData.email_notifications_enabled !== false; // default true
    const newRequestEmailEnabled = spData.new_request_email_enabled !== false; // default true
    const acceptedOfferEmailEnabled = spData.accepted_offer_email_enabled !== false; // default true
    const newMessageEmailEnabled = spData.new_message_email_enabled !== false; // default true
    const newReviewEmailEnabled = spData.new_review_email_enabled !== false; // default true
    
    console.log('\nPreferințe notificare:');
    console.log(`- Email notificări activate: ${emailNotificationsEnabled ? 'DA' : 'NU'}`);
    console.log(`- Notificări cerere nouă: ${newRequestEmailEnabled ? 'DA' : 'NU'}`);
    console.log(`- Notificări ofertă acceptată: ${acceptedOfferEmailEnabled ? 'DA' : 'NU'}`);
    console.log(`- Notificări mesaj nou: ${newMessageEmailEnabled ? 'DA' : 'NU'}`);
    console.log(`- Notificări recenzie nouă: ${newReviewEmailEnabled ? 'DA' : 'NU'}`);
    
    // Confirmăm API key ElasticEmail
    console.log('\nVerificare configurare ElasticEmail:');
    const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
    if (!apiKey) {
      console.error('❌ API KEY LIPSĂ! Setați variabila de mediu ELASTIC_EMAIL_API_KEY pentru a trimite notificări email.');
      return;
    }
    console.log(`- API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`- Email expeditor: ${EmailService.getFromEmail()}`);
    console.log(`- Nume expeditor: ${EmailService.getFromName()}`);
    
    // Generăm ID-uri unice pentru fiecare tip de notificare (pentru prevenirea duplicatelor)
    const timestamp = Date.now();
    const requestId = `test_request_${timestamp}`;
    const offerId = `test_offer_${timestamp}`;
    const messageId = `test_message_${timestamp}`;
    const reviewId = `test_review_${timestamp}`;
    
    // Test 1: Notificare cerere nouă
    console.log('\n📧 Test 1: Notificare CERERE NOUĂ...');
    if (!emailNotificationsEnabled || !newRequestEmailEnabled) {
      console.log('⚠️ Notificările pentru cereri noi sunt dezactivate în preferințele utilizatorului!');
      console.log('Continuăm totuși testul pentru a verifica funcționalitatea...');
    }
    
    const requestTitle = 'Testare Montare anvelope';
    const requestResult = await sendNewRequestNotification(
      spData.email,
      spData.company_name,
      requestTitle,
      'Client Test',
      requestId
    );
    console.log(`Rezultat: ${requestResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    // Test 2: Notificare ofertă acceptată
    console.log('\n📧 Test 2: Notificare OFERTĂ ACCEPTATĂ...');
    if (!emailNotificationsEnabled || !acceptedOfferEmailEnabled) {
      console.log('⚠️ Notificările pentru oferte acceptate sunt dezactivate în preferințele utilizatorului!');
      console.log('Continuăm totuși testul pentru a verifica funcționalitatea...');
    }
    
    const offerTitle = 'Ofertă Reparație Suspensie';
    const offerResult = await sendOfferAcceptedNotification(
      spData.email,
      spData.company_name,
      offerTitle,
      'Client Test',
      offerId
    );
    console.log(`Rezultat: ${offerResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    // Test 3: Notificare mesaj nou
    console.log('\n📧 Test 3: Notificare MESAJ NOU...');
    if (!emailNotificationsEnabled || !newMessageEmailEnabled) {
      console.log('⚠️ Notificările pentru mesaje noi sunt dezactivate în preferințele utilizatorului!');
      console.log('Continuăm totuși testul pentru a verifica funcționalitatea...');
    }
    
    const messageContent = 'Acesta este un mesaj de test pentru verificarea sistemului de notificări. Mesajul a fost trimis automat din scriptul de testare.';
    const messageResult = await sendNewMessageNotification(
      spData.email,
      spData.company_name,
      messageContent,
      'Client Test',
      'Cerere test notificări',
      messageId
    );
    console.log(`Rezultat: ${messageResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    // Test 4: Notificare recenzie nouă
    console.log('\n📧 Test 4: Notificare RECENZIE NOUĂ...');
    if (!emailNotificationsEnabled || !newReviewEmailEnabled) {
      console.log('⚠️ Notificările pentru recenzii noi sunt dezactivate în preferințele utilizatorului!');
      console.log('Continuăm totuși testul pentru a verifica funcționalitatea...');
    }
    
    const reviewContent = 'Servicii foarte bune și profesionale. Recomand cu încredere acest service auto!';
    const reviewResult = await sendNewReviewNotification(
      spData.email,
      spData.company_name,
      'Client Test',
      5,
      reviewContent,
      reviewId
    );
    console.log(`Rezultat: ${reviewResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    // Statistici finale
    console.log('\n=== SUMARUL TESTULUI ===');
    console.log(`Service Provider: ${spData.company_name} (ID: ${spData.id})`);
    console.log(`Email: ${spData.email}`);
    console.log('\nRezultate teste:');
    console.log(`- Notificare cerere nouă: ${requestResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    console.log(`- Notificare ofertă acceptată: ${offerResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    console.log(`- Notificare mesaj nou: ${messageResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    console.log(`- Notificare recenzie nouă: ${reviewResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    const totalSuccess = [requestResult, offerResult, messageResult, reviewResult].filter(Boolean).length;
    console.log(`\nRezultat global: ${totalSuccess}/4 teste reușite`);
    
    if (totalSuccess === 4) {
      console.log('\n🎉 TOATE TESTELE AU REUȘIT! Sistemul de notificări prin email funcționează corect.');
      console.log(`Verificați adresa de email ${spData.email} pentru a confirma primirea notificărilor.`);
    } else {
      console.log(`\n⚠️ Au reușit doar ${totalSuccess} din 4 teste. Verificați erorile de mai sus.`);
    }
    
    // Închide conexiunea la baza de date
    await pool.end();
    
  } catch (error) {
    console.error('❌ EROARE ÎN TIMPUL TESTULUI:', error);
  }
  
  console.log('\n=== TEST COMPLET ===');
}

// Execută funcția principală
main().catch(console.error);