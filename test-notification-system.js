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

import fetch from 'node-fetch';
import pg from 'pg';
const { Pool } = pg;

// Configurare conexiune la baza de date
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Configurare API Elastic Email
const ELASTIC_EMAIL_API_KEY = process.env.ELASTIC_EMAIL_API_KEY;
const FROM_EMAIL = 'notificari@carvizio.ro';
const FROM_NAME = 'Auto Service App';
const API_BASE_URL = 'https://api.elasticemail.com/v2';

// Funcție generică pentru trimiterea email-urilor
async function sendEmail(to, subject, htmlContent, textContent, messageId = `test_${Date.now()}`) {
  try {
    console.log(`\n[${messageId}] 📧 ===== ELASTIC EMAIL - TRIMITERE EMAIL =====`);
    console.log(`[${messageId}] 📋 Detalii email:`);
    console.log(`[${messageId}]   • Destinatar:`, to);
    console.log(`[${messageId}]   • Subiect:`, subject);
    console.log(`[${messageId}]   • Conținut HTML:`, htmlContent ? htmlContent.substring(0, 50) + '...' : 'Nu există');

    // Construim parametrii pentru request
    const params = new URLSearchParams();
    params.append('apikey', ELASTIC_EMAIL_API_KEY);
    params.append('to', to);
    params.append('from', FROM_EMAIL);
    params.append('fromName', FROM_NAME);
    params.append('subject', subject);
    params.append('bodyHtml', htmlContent);
    if (textContent) {
      params.append('bodyText', textContent);
    }

    console.log(`[${messageId}] 🔄 Trimitere cerere către API...`);
    
    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-ElasticEmail-ApiKey': ELASTIC_EMAIL_API_KEY
      },
      body: params
    });
    const endTime = Date.now();
    
    console.log(`[${messageId}] ⏱️ Durata cerere API: ${endTime - startTime}ms`);
    console.log(`[${messageId}] 📊 Răspuns primit: [${response.status}] ${response.statusText}`);
    
    if (!response.ok) {
      let errorText = await response.text();
      console.error(`[${messageId}] ❌ Eroare la trimiterea email-ului. Status:`, response.status, errorText);
      return false;
    }

    const data = await response.json();
    console.log(`[${messageId}] ✅ Email trimis cu succes!`, data);
    console.log(`[${messageId}] 📧 ===== SFÂRȘIT TRIMITERE EMAIL =====\n`);
    return true;
  } catch (error) {
    console.error(`Eroare la trimiterea email-ului:`, error);
    return false;
  }
}

// Funcții pentru tipuri specifice de notificări
async function sendNewRequestNotification(email, companyName, requestTitle, clientName, messageId = `request_${Date.now()}`) {
  const subject = `Cerere nouă: ${requestTitle} [${messageId}]`;
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
      <!-- ID Cerere: ${messageId} - Folosit pentru prevenirea duplicării -->
    </div>
  `;
  const text = `Cerere nouă de service: ${requestTitle}\n\nBună ziua, ${companyName},\n\nAți primit o cerere nouă de service de la ${clientName}.\n\nPuteți vizualiza detaliile și răspunde acestei cereri din contul dvs.\n\nAcest email a fost trimis automat de aplicația Auto Service. Puteți dezactiva notificările prin email din setările contului dvs.`;
  return await sendEmail(email, subject, html, text, messageId);
}

async function sendOfferAcceptedNotification(email, companyName, offerTitle, clientName, messageId = `offer_${Date.now()}`) {
  const subject = `Ofertă acceptată: ${offerTitle} [${messageId}]`;
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
      <!-- ID Ofertă: ${messageId} - Folosit pentru prevenirea duplicării -->
    </div>
  `;
  const text = `Ofertă acceptată: ${offerTitle}\n\nBună ziua, ${companyName},\n\n${clientName} a acceptat oferta dvs.\n\nPuteți vizualiza detaliile și contacta clientul din contul dvs.\n\nAcest email a fost trimis automat de aplicația Auto Service. Puteți dezactiva notificările prin email din setările contului dvs.`;
  return await sendEmail(email, subject, html, text, messageId);
}

async function sendNewMessageNotification(email, companyName, messageContent, senderName, requestOrOfferTitle, messageId = `message_${Date.now()}`) {
  const subject = `Mesaj nou: ${senderName} [${messageId}]`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">Mesaj nou</h2>
      <p>Bună ziua, ${companyName},</p>
      <p>Ați primit un mesaj nou de la <strong>${senderName}</strong> pentru <strong>${requestOrOfferTitle}</strong>:</p>
      <div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 15px; margin: 20px 0;">
        <p style="margin-top: 0;">${messageContent}</p>
      </div>
      <p>Puteți răspunde acestui mesaj din contul dvs.</p>
      <p>
        <a href="https://auto-service-app.replit.app/service-dashboard?tab=mesaje" 
           style="background-color: #4299e1; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Vezi mesajul
        </a>
      </p>
      <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
        Acest email a fost trimis automat de aplicația Auto Service.
        <br>
        Puteți dezactiva notificările prin email din setările contului dvs.
      </p>
      <!-- ID Mesaj: ${messageId} - Folosit pentru prevenirea duplicării -->
    </div>
  `;
  const text = `Mesaj nou: ${senderName}\n\nBună ziua, ${companyName},\n\nAți primit un mesaj nou de la ${senderName} pentru ${requestOrOfferTitle}:\n\n${messageContent}\n\nPuteți răspunde acestui mesaj din contul dvs.\n\nAcest email a fost trimis automat de aplicația Auto Service. Puteți dezactiva notificările prin email din setările contului dvs.`;
  return await sendEmail(email, subject, html, text, messageId);
}

async function sendNewReviewNotification(email, companyName, clientName, rating, reviewContent, messageId = `review_${Date.now()}`) {
  const subject = `Recenzie nouă: ${clientName} a acordat ${rating} stele [${messageId}]`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">Recenzie nouă</h2>
      <p>Bună ziua, ${companyName},</p>
      <p><strong>${clientName}</strong> v-a lăsat o recenzie nouă:</p>
      <div style="background-color: #f7fafc; border-left: 4px solid ${rating >= 4 ? '#68d391' : rating >= 3 ? '#ecc94b' : '#f56565'}; padding: 15px; margin: 20px 0;">
        <p style="margin-top: 0; font-size: 1.2em;">Evaluare: ${Array(rating).fill('★').join('')}${Array(5-rating).fill('☆').join('')} (${rating}/5)</p>
        <p>${reviewContent}</p>
      </div>
      <p>Puteți vizualiza toate recenziile din contul dvs.</p>
      <p>
        <a href="https://auto-service-app.replit.app/service-dashboard?tab=recenzii" 
           style="background-color: #4299e1; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Vezi recenziile
        </a>
      </p>
      <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
        Acest email a fost trimis automat de aplicația Auto Service.
        <br>
        Puteți dezactiva notificările prin email din setările contului dvs.
      </p>
      <!-- ID Recenzie: ${messageId} - Folosit pentru prevenirea duplicării -->
    </div>
  `;
  const text = `Recenzie nouă: ${clientName} a acordat ${rating} stele\n\nBună ziua, ${companyName},\n\n${clientName} v-a lăsat o recenzie nouă:\n\nEvaluare: ${rating}/5\n\n${reviewContent}\n\nPuteți vizualiza toate recenziile din contul dvs.\n\nAcest email a fost trimis automat de aplicația Auto Service. Puteți dezactiva notificările prin email din setările contului dvs.`;
  return await sendEmail(email, subject, html, text, messageId);
}

// Funcție pentru verificarea preferințelor de notificare ale unui furnizor de servicii
async function getServiceProviderWithPreferences(serviceProviderId) {
  try {
    const providerResult = await pool.query(
      'SELECT * FROM service_providers WHERE id = $1', 
      [serviceProviderId]
    );
    
    if (providerResult.rows.length === 0) {
      console.error(`Nu s-a găsit furnizorul de servicii cu ID ${serviceProviderId}`);
      return null;
    }
    
    const provider = providerResult.rows[0];
    
    // Verifică existența preferințelor de notificare
    const preferencesResult = await pool.query(
      'SELECT * FROM notification_preferences WHERE service_provider_id = $1',
      [serviceProviderId]
    );
    
    const preferences = preferencesResult.rows.length > 0 ? 
      preferencesResult.rows[0] : 
      {
        email_notifications_enabled: true,
        new_request_email_enabled: true,
        accepted_offer_email_enabled: true,
        new_message_email_enabled: true,
        new_review_email_enabled: true
      };
    
    // Remap from snake_case keys to camelCase for consistent access throughout the test
    return {
      id: provider.id,
      email: provider.email,
      company_name: provider.company_name, // Keep snake_case for direct DB values
      companyName: provider.company_name, // Also provide camelCase for TypeScript use
      notificationPreferences: preferences
    };
  } catch (error) {
    console.error("Eroare la obținerea furnizorului de servicii și a preferințelor:", error);
    return null;
  }
}

// Funcție principală
async function main() {
  try {
    console.log("=== Test Sistem Notificări Email ===");
    console.log("Mediu:", process.env.NODE_ENV);
    console.log("API Key Configurată:", !!ELASTIC_EMAIL_API_KEY);
    
    if (!ELASTIC_EMAIL_API_KEY) {
      console.error("API Key pentru Elastic Email nu este configurată!");
      // In ES modules we use a different approach than process.exit
      throw new Error("API Key missing");
    }
    
    // Testăm conexiunea la baza de date
    const dbTest = await pool.query('SELECT NOW()');
    console.log("Conexiune reușită la baza de date:", dbTest.rows[0].now);
    
    // Obținem service provider-ul cu ID-ul 1 (NKLN Service) pentru teste
    const serviceProvider = await getServiceProviderWithPreferences(1);
    
    if (!serviceProvider) {
      console.error("Nu s-a putut obține service provider-ul pentru teste");
      throw new Error("Service provider not found");
    }
    
    console.log(`\nService Provider pentru teste:`);
    console.log(`- ID: ${serviceProvider.id}`);
    console.log(`- Nume: ${serviceProvider.company_name}`);
    console.log(`- Email: ${serviceProvider.email}`);
    console.log(`- Preferințe notificări email:`);
    console.log(`  * Activat general: ${serviceProvider.notificationPreferences.email_notifications_enabled}`);
    console.log(`  * Cereri noi: ${serviceProvider.notificationPreferences.new_request_email_enabled}`);
    console.log(`  * Oferte acceptate: ${serviceProvider.notificationPreferences.accepted_offer_email_enabled}`);
    console.log(`  * Mesaje noi: ${serviceProvider.notificationPreferences.new_message_email_enabled}`);
    console.log(`  * Recenzii noi: ${serviceProvider.notificationPreferences.new_review_email_enabled}`);
    
    // Test pentru toate tipurile de notificări
    console.log("\n=== Începere teste pentru toate tipurile de notificări ===");
    
    // 1. Notificare pentru cerere nouă
    console.log("\n1. Test notificare cerere nouă:");
    const requestResult = await sendNewRequestNotification(
      serviceProvider.email,
      serviceProvider.company_name,
      "Reparație cutie de viteze",
      "Ion Popescu",
      `request_test_${Date.now()}`
    );
    console.log(`Rezultat notificare cerere nouă: ${requestResult ? "Succes" : "Eșec"}`);
    
    // 2. Notificare pentru ofertă acceptată
    console.log("\n2. Test notificare ofertă acceptată:");
    const offerResult = await sendOfferAcceptedNotification(
      serviceProvider.email,
      serviceProvider.company_name,
      "Ofertă reparație suspensie",
      "Maria Ionescu",
      `offer_test_${Date.now()}`
    );
    console.log(`Rezultat notificare ofertă acceptată: ${offerResult ? "Succes" : "Eșec"}`);
    
    // 3. Notificare pentru mesaj nou
    console.log("\n3. Test notificare mesaj nou:");
    const messageResult = await sendNewMessageNotification(
      serviceProvider.email,
      serviceProvider.company_name,
      "Bună ziua, aș dori să știu când va fi gata mașina?",
      "Gheorghe Popescu",
      "Reparație frâne",
      `message_test_${Date.now()}`
    );
    console.log(`Rezultat notificare mesaj nou: ${messageResult ? "Succes" : "Eșec"}`);
    
    // 4. Notificare pentru recenzie nouă
    console.log("\n4. Test notificare recenzie nouă:");
    const reviewResult = await sendNewReviewNotification(
      serviceProvider.email,
      serviceProvider.company_name,
      "Ana Dumitrescu",
      5, // rating
      "Servicii excelente, mașina funcționează perfect după reparație. Recomand cu încredere!",
      `review_test_${Date.now()}`
    );
    console.log(`Rezultat notificare recenzie nouă: ${reviewResult ? "Succes" : "Eșec"}`);
    
    console.log("\n=== Sumar teste notificări email ===");
    console.log(`- Cerere nouă: ${requestResult ? "✅ Succes" : "❌ Eșec"}`);
    console.log(`- Ofertă acceptată: ${offerResult ? "✅ Succes" : "❌ Eșec"}`);
    console.log(`- Mesaj nou: ${messageResult ? "✅ Succes" : "❌ Eșec"}`);
    console.log(`- Recenzie nouă: ${reviewResult ? "✅ Succes" : "❌ Eșec"}`);
    
    console.log("\n=== Testare completă ===");
    
  } catch (error) {
    console.error("Eroare în timpul testării:", error);
  } finally {
    // Închidem pool-ul de conexiuni la baza de date
    await pool.end();
  }
}

// Rulăm funcția principală
main().catch(err => {
  console.error("Eroare neașteptată:", err);
});