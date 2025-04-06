/**
 * Direct Test Notifications 
 * Script simplu pentru testarea notificărilor prin email, fără a folosi module TypeScript
 */

import fetch from 'node-fetch';
import pkg from 'pg';
const { Pool } = pkg;

// Configurație de bază - aceeași ca în modulul EmailService
const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
const fromEmail = 'notificari@carvizio.ro';
const fromName = 'Auto Service App';
const baseUrl = 'https://api.elasticemail.com/v2';

// Funcție de trimitere email - reimplementare directă a logicii din EmailService
async function sendEmail(to, subject, htmlContent, textContent) {
  try {
    console.log(`\n📧 Trimitere email către: ${to}`);
    console.log(`📋 Subiect: ${subject}`);
    
    if (!apiKey) {
      console.error('🚫 API key pentru Elastic Email nu este configurat');
      return false;
    }

    // Construim parametrii pentru request
    const params = new URLSearchParams();
    params.append('apikey', apiKey);
    params.append('to', to);
    params.append('from', fromEmail);
    params.append('fromName', fromName);
    params.append('subject', subject);
    params.append('bodyHtml', htmlContent);
    if (textContent) {
      params.append('bodyText', textContent);
    }
    
    console.log('🔄 Trimitere cerere către API Elastic Email...');
    
    const response = await fetch(`${baseUrl}/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-ElasticEmail-ApiKey': apiKey
      },
      body: params
    });
    
    console.log(`📊 Răspuns: [${response.status}] ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Eroare la trimiterea email-ului:', errorText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Email trimis cu succes:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Excepție la trimiterea email-ului:', error);
    return false;
  }
}

// Funcție pentru notificare cerere nouă
async function sendNewRequestNotification(email, companyName, requestTitle, clientName) {
  console.log(`=== Test notificare CERERE NOUĂ ===`);
  
  const subject = `Cerere nouă: ${requestTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">Cerere nouă de service</h2>
      <p>Bună ziua, ${companyName},</p>
      <p>Ați primit o cerere nouă de service de la <strong>${clientName}</strong>:</p>
      <div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${requestTitle}</h3>
      </div>
      <p>Puteți vizualiza detaliile și răspunde acestei cereri din contul dvs.</p>
      <p>
        <a href="https://auto-service-app.replit.app/service-dashboard?tab=cereri" 
           style="background-color: #4299e1; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Vezi cererea
        </a>
      </p>
      <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
        Acest email a fost trimis automat de aplicația Auto Service.
        <br>
        Puteți dezactiva notificările prin email din setările contului dvs.
      </p>
      <p style="color: #718096; font-size: 0.8em;">
        TEST DIRECT - IGNORAȚI ACEST EMAIL
      </p>
    </div>
  `;
  
  return await sendEmail(email, subject, html);
}

// Funcție pentru notificare ofertă acceptată
async function sendOfferAcceptedNotification(email, companyName, offerTitle, clientName) {
  console.log(`=== Test notificare OFERTĂ ACCEPTATĂ ===`);
  
  const subject = `Ofertă acceptată: ${offerTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">Ofertă acceptată</h2>
      <p>Bună ziua, ${companyName},</p>
      <p><strong>${clientName}</strong> a acceptat oferta dvs. pentru:</p>
      <div style="background-color: #f7fafc; border-left: 4px solid #68d391; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${offerTitle}</h3>
      </div>
      <p>Puteți vizualiza detaliile și contacta clientul din contul dvs.</p>
      <p>
        <a href="https://auto-service-app.replit.app/service-dashboard?tab=oferte-acceptate" 
           style="background-color: #68d391; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Vezi oferta acceptată
        </a>
      </p>
      <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
        Acest email a fost trimis automat de aplicația Auto Service.
        <br>
        Puteți dezactiva notificările prin email din setările contului dvs.
      </p>
      <p style="color: #718096; font-size: 0.8em;">
        TEST DIRECT - IGNORAȚI ACEST EMAIL
      </p>
    </div>
  `;
  
  return await sendEmail(email, subject, html);
}

// Funcție pentru notificare mesaj nou
async function sendNewMessageNotification(email, companyName, messageContent, senderName, requestOrOfferTitle) {
  console.log(`=== Test notificare MESAJ NOU ===`);
  
  const subject = `Mesaj nou de la ${senderName}`;
  
  // Truncăm mesajul dacă este prea lung
  const truncatedMessage = messageContent.length > 150 
    ? messageContent.substring(0, 147) + '...' 
    : messageContent;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">Mesaj nou</h2>
      <p>Bună ziua, ${companyName},</p>
      <p>Ați primit un mesaj nou de la <strong>${senderName}</strong> referitor la "${requestOrOfferTitle}":</p>
      <div style="background-color: #f7fafc; border-left: 4px solid #f6ad55; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; font-style: italic;">"${truncatedMessage}"</p>
      </div>
      <p>Puteți vizualiza conversația completă și răspunde din contul dvs.</p>
      <p>
        <a href="https://auto-service-app.replit.app/service-dashboard?tab=mesaje" 
           style="background-color: #f6ad55; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Vezi mesajele
        </a>
      </p>
      <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
        Acest email a fost trimis automat de aplicația Auto Service.
        <br>
        Puteți dezactiva notificările prin email din setările contului dvs.
      </p>
      <p style="color: #718096; font-size: 0.8em;">
        TEST DIRECT - IGNORAȚI ACEST EMAIL
      </p>
    </div>
  `;
  
  return await sendEmail(email, subject, html);
}

// Funcție pentru notificare recenzie nouă
async function sendNewReviewNotification(email, companyName, clientName, rating, reviewContent) {
  console.log(`=== Test notificare RECENZIE NOUĂ ===`);
  
  // Generăm stele pentru rating
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  
  const subject = `Recenzie nouă de la ${clientName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">Recenzie nouă</h2>
      <p>Bună ziua, ${companyName},</p>
      <p>Ați primit o recenzie nouă de la <strong>${clientName}</strong>:</p>
      <div style="background-color: #f7fafc; border-left: 4px solid #9f7aea; padding: 15px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-size: 1.2em; color: #d69e2e;">${stars} (${rating}/5)</p>
        <p style="margin: 0; font-style: italic;">"${reviewContent}"</p>
      </div>
      <p>Puteți vizualiza toate recenziile primite din contul dvs.</p>
      <p>
        <a href="https://auto-service-app.replit.app/service-dashboard?tab=account" 
           style="background-color: #9f7aea; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Vezi toate recenziile
        </a>
      </p>
      <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
        Acest email a fost trimis automat de aplicația Auto Service.
        <br>
        Puteți dezactiva notificările prin email din setările contului dvs.
      </p>
      <p style="color: #718096; font-size: 0.8em;">
        TEST DIRECT - IGNORAȚI ACEST EMAIL
      </p>
    </div>
  `;
  
  return await sendEmail(email, subject, html);
}

// Funcția principală de testare
async function main() {
  console.log('=== TESTARE DIRECTĂ NOTIFICĂRI EMAIL ===');
  
  try {
    // Obținem informații despre service provider direct din baza de date
    console.log('🔍 Obținere date service provider din baza de date...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Test: dacă API key există
    console.log('\n📋 Verificare API Elastic Email:');
    console.log(`- API URL: ${baseUrl}`);
    console.log(`- Email expeditor: ${fromEmail}`);
    console.log('- API Key configurată:', !!apiKey);
    if (apiKey) {
      console.log(`- API Key primele/ultimele caractere: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    } else {
      console.error('⚠️ API KEY LIPSĂ - Notificările email nu vor funcționa!');
      process.exit(1);
    }
    
    // Obținem date despre service provider cu ID 1
    const result = await pool.query('SELECT * FROM service_providers WHERE id = 15');
    if (result.rows.length === 0) {
      throw new Error('Nu s-a găsit service provider cu ID 1');
    }
    
    const serviceProvider = result.rows[0];
    console.log('\n📋 Date service provider:');
    console.log(`- ID: ${serviceProvider.id}`);
    console.log(`- Nume companie: ${serviceProvider.company_name}`);
    console.log(`- Email: ${serviceProvider.email}`);
    console.log(`- Telefon: ${serviceProvider.phone}`);
    
    // Obținem preferințele de notificare
    const prefResult = await pool.query('SELECT * FROM notification_preferences WHERE service_provider_id = 15');
    let emailEnabled = true;
    let requestEnabled = true;
    let offerEnabled = true;
    let messageEnabled = true;
    let reviewEnabled = true;
    
    if (prefResult.rows.length > 0) {
      const prefs = prefResult.rows[0];
      emailEnabled = prefs.email_notifications_enabled;
      requestEnabled = prefs.new_request_email_enabled;
      offerEnabled = prefs.accepted_offer_email_enabled;
      messageEnabled = prefs.new_message_email_enabled;
      reviewEnabled = prefs.new_review_email_enabled;
      
      console.log('\n📋 Preferințe notificare:');
      console.log(`- Email notificări active: ${emailEnabled ? 'DA' : 'NU'}`);
      console.log(`- Notificări cerere nouă: ${requestEnabled ? 'DA' : 'NU'}`);
      console.log(`- Notificări ofertă acceptată: ${offerEnabled ? 'DA' : 'NU'}`);
      console.log(`- Notificări mesaj nou: ${messageEnabled ? 'DA' : 'NU'}`);
      console.log(`- Notificări recenzie nouă: ${reviewEnabled ? 'DA' : 'NU'}`);
    } else {
      console.log('\n⚠️ Nu s-au găsit preferințe de notificare. Se folosesc valorile implicite (toate active).');
    }
    
    // Verificăm dacă notificările prin email sunt active global
    if (!emailEnabled) {
      console.log('\n⚠️ Notificările prin email sunt DEZACTIVATE pentru acest service provider.');
      console.log('Vom continua testarea oricum, dar în aplicația reală aceste email-uri NU ar fi trimise.');
    }
    
    // Trimitem fiecare tip de notificare
    if (requestEnabled || true) { // Forțăm trimiterea pentru testare
      console.log('\n⏳ Test notificare CERERE NOUĂ...');
      const requestResult = await sendNewRequestNotification(
        serviceProvider.email,
        serviceProvider.company_name,
        'Test cerere service auto',
        'Client Test'
      );
      console.log(`✅ Rezultat test cerere nouă: ${requestResult ? 'SUCCES' : 'EȘEC'}`);
    }
    
    if (offerEnabled || true) { // Forțăm trimiterea pentru testare
      console.log('\n⏳ Test notificare OFERTĂ ACCEPTATĂ...');
      const offerResult = await sendOfferAcceptedNotification(
        serviceProvider.email,
        serviceProvider.company_name,
        'Test ofertă service auto',
        'Client Test'
      );
      console.log(`✅ Rezultat test ofertă acceptată: ${offerResult ? 'SUCCES' : 'EȘEC'}`);
    }
    
    if (messageEnabled || true) { // Forțăm trimiterea pentru testare
      console.log('\n⏳ Test notificare MESAJ NOU...');
      const messageResult = await sendNewMessageNotification(
        serviceProvider.email,
        serviceProvider.company_name,
        'Acesta este un mesaj de test pentru a verifica funcționalitatea notificărilor prin email.',
        'Client Test',
        'Cerere service test'
      );
      console.log(`✅ Rezultat test mesaj nou: ${messageResult ? 'SUCCES' : 'EȘEC'}`);
    }
    
    if (reviewEnabled || true) { // Forțăm trimiterea pentru testare
      console.log('\n⏳ Test notificare RECENZIE NOUĂ...');
      const reviewResult = await sendNewReviewNotification(
        serviceProvider.email,
        serviceProvider.company_name,
        'Client Test',
        4,
        'Acesta este un text de recenzie de test pentru a verifica funcționalitatea notificărilor prin email. Serviciu excelent, recomand!'
      );
      console.log(`✅ Rezultat test recenzie nouă: ${reviewResult ? 'SUCCES' : 'EȘEC'}`);
    }
    
    console.log('\n✅ TESTARE COMPLETĂ');
    console.log('Verificați adresa de email a service provider-ului pentru a confirma primirea email-urilor de test.');
    
    // Închidem conexiunea la bază de date
    await pool.end();
    
  } catch (error) {
    console.error('❌ EROARE ÎN TIMPUL TESTĂRII:', error);
    process.exit(1);
  }
  
  console.log('\n=== SFÂRȘIT TESTARE ===');
}

main().catch(console.error);