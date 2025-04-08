/**
 * Test direct pentru trimiterea de notificări email pentru cereri noi
 * Acest script simplu verifică și depanează funcționalitatea EmailService
 * pentru trimiterea de notificări email pentru cereri noi
 */

import fetch from 'node-fetch';

// Constants
const API_KEY = process.env.ELASTIC_EMAIL_API_KEY;
const FROM_EMAIL = 'notificari@carvizio.ro';
const FROM_NAME = 'Auto Service App';
const BASE_URL = 'https://api.elasticemail.com/v2';

// Verify environment variables
console.log('=== Test Environment Variables ===');
console.log(`API Key configured: ${!!API_KEY}`);
if (API_KEY) {
  console.log(`API Key (masked): ${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}`);
} else {
  console.log('WARNING: ELASTIC_EMAIL_API_KEY is not set!');
  console.log('Available environment variables:', Object.keys(process.env).join(', '));
}
console.log(`From Email: ${FROM_EMAIL}`);
console.log(`From Name: ${FROM_NAME}`);
console.log(`Base URL: ${BASE_URL}`);

/**
 * Funcție pentru trimiterea unui email prin Elastic Email API
 */
async function sendEmail(to, subject, htmlContent, textContent, messageId = `test_${Date.now()}`) {
  console.log(`\n[${messageId}] === Trimitere test email ===`);
  console.log(`[${messageId}] • Destinatar: ${to}`);
  console.log(`[${messageId}] • Subiect: ${subject}`);
  
  if (!API_KEY) {
    console.error(`[${messageId}] ❌ Eroare: ELASTIC_EMAIL_API_KEY nu este setat. Nu se poate trimite email.`);
    return false;
  }
  
  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.error(`[${messageId}] ❌ Eroare: Format invalid de email pentru destinatar: ${to}`);
    return false;
  }
  
  const params = new URLSearchParams();
  params.append('apikey', API_KEY);
  params.append('to', to);
  params.append('from', FROM_EMAIL);
  params.append('fromName', FROM_NAME);
  params.append('subject', subject);
  params.append('bodyHtml', htmlContent);
  if (textContent) {
    params.append('bodyText', textContent);
  }

  try {
    console.log(`[${messageId}] 🔄 Trimitere cerere către API...`);
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const elapsedTime = Date.now() - startTime;
    console.log(`[${messageId}] ⏱️ Timpul de răspuns: ${elapsedTime}ms`);

    const result = await response.json();
    console.log(`[${messageId}] 📄 Răspuns API:`, JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log(`[${messageId}] ✅ Email trimis cu succes! MessageID: ${result.data?.messageID || 'N/A'}`);
      return true;
    } else {
      console.error(`[${messageId}] ❌ Eroare la trimiterea email-ului: ${result.error || 'Eroare necunoscută'}`);
      return false;
    }
  } catch (error) {
    console.error(`[${messageId}] ❌ Excepție la trimiterea email-ului:`, error);
    return false;
  }
}

/**
 * Trimite notificare de cerere nouă - exact ca și implementarea din EmailService
 */
async function sendNewRequestNotification(
  serviceProvider,
  requestTitle,
  clientName,
  requestId
) {
  const messageId = `request_${requestId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  console.log(`\n=== Test sendNewRequestNotification [${messageId}] ===`);
  console.log(`Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
  console.log(`Titlu cerere: ${requestTitle}`);
  console.log(`Client: ${clientName}`);
  console.log(`ID Cerere: ${requestId}`);
  
  // Verificăm dacă există email pentru service provider
  if (!serviceProvider.email) {
    console.error(`❌ [${messageId}] Lipsă adresă email pentru service provider ${serviceProvider.id} (${serviceProvider.companyName})`);
    return false;
  }
  
  // Validăm formatul adresei de email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(serviceProvider.email)) {
    console.error(`❌ [${messageId}] Format invalid de email pentru service provider ${serviceProvider.id}: ${serviceProvider.email}`);
    return false;
  }
  
  const subject = `Cerere nouă: ${requestTitle}`;
  // Adăugăm un identificator unic în subiect pentru a preveni gruparea mesajelor
  const uniqueSubject = `${subject} [${messageId}]`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">Cerere nouă de service</h2>
      <p>Bună ziua, ${serviceProvider.companyName},</p>
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
      <!-- ID Cerere: ${requestId}, MessageID: ${messageId} - Folosit pentru prevenirea duplicării -->
    </div>
  `;
  
  const text = `
Cerere nouă de service - ${requestTitle}

Bună ziua ${serviceProvider.companyName},

Ați primit o cerere nouă de service de la ${clientName}.

Titlu cerere: ${requestTitle}

Puteți vizualiza detaliile și răspunde acestei cereri accesând:
https://auto-service-app.replit.app/service-dashboard?tab=cereri

Acest email a fost trimis automat de aplicația Auto Service.
Puteți dezactiva notificările prin email din setările contului dvs.

ID Mesaj: ${messageId}
  `;
  
  try {
    console.log(`📧 [${messageId}] Trimitere email de notificare pentru cererea nouă către ${serviceProvider.email}...`);
    
    const result = await sendEmail(
      serviceProvider.email, 
      uniqueSubject, 
      html, 
      text,
      messageId
    );
    
    if (result) {
      console.log(`✅ [${messageId}] Email trimis cu succes către ${serviceProvider.companyName} (${serviceProvider.email}) pentru cererea ${requestId}`);
    } else {
      console.error(`❌ [${messageId}] Eroare la trimiterea email-ului către ${serviceProvider.companyName} (${serviceProvider.email}) pentru cererea ${requestId}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ [${messageId}] Excepție la trimiterea email-ului către ${serviceProvider.companyName} (${serviceProvider.email}) pentru cererea ${requestId}:`, error);
    return false;
  }
}

/**
 * Trimite un test de notificare mesaj nou - pentru comparație
 */
async function sendNewMessageNotification(
  serviceProvider,
  messageContent,
  senderName,
  requestOrOfferTitle,
  messageId = `message_${Date.now()}`
) {
  console.log(`\n=== Test sendNewMessageNotification [${messageId}] ===`);
  console.log(`Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
  console.log(`Expeditor: ${senderName}`);
  console.log(`Referitor la: ${requestOrOfferTitle}`);
  console.log(`Conținut mesaj (primele 50 caractere): ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`);
  
  const subject = `Mesaj nou de la ${senderName}`;
  // Adăugăm un identificator unic în subiect pentru a preveni gruparea mesajelor
  const uniqueSubject = `${subject} [${messageId}]`;
  
  // Truncăm mesajul dacă este prea lung
  const truncatedMessage = messageContent.length > 150 
    ? messageContent.substring(0, 147) + '...' 
    : messageContent;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">Mesaj nou</h2>
      <p>Bună ziua, ${serviceProvider.companyName},</p>
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
      <!-- ID Mesaj: ${messageId} - Folosit pentru prevenirea duplicării -->
    </div>
  `;

  const text = `
Mesaj nou de la ${senderName}

Bună ziua ${serviceProvider.companyName},

Ați primit un mesaj nou de la ${senderName} referitor la "${requestOrOfferTitle}":

"${truncatedMessage}"

Puteți vizualiza conversația completă și răspunde din contul dvs accesând:
https://auto-service-app.replit.app/service-dashboard?tab=mesaje

Acest email a fost trimis automat de aplicația Auto Service.
Puteți dezactiva notificările prin email din setările contului dvs.

ID Mesaj: ${messageId}
  `;
  
  try {
    console.log(`📧 [${messageId}] Trimitere email de notificare pentru mesaj nou către ${serviceProvider.email}...`);
    
    const result = await sendEmail(
      serviceProvider.email, 
      uniqueSubject, 
      html, 
      text,
      messageId
    );
    
    if (result) {
      console.log(`✅ [${messageId}] Email pentru notificare mesaj nou trimis cu succes către ${serviceProvider.companyName} (${serviceProvider.email})`);
    } else {
      console.error(`❌ [${messageId}] Eroare la trimiterea email-ului pentru notificare mesaj nou către ${serviceProvider.companyName} (${serviceProvider.email})`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ [${messageId}] Excepție la trimiterea email-ului pentru notificare mesaj nou către ${serviceProvider.companyName} (${serviceProvider.email}):`, error);
    return false;
  }
}

/**
 * Funcția principală
 */
async function main() {
  console.log('\n=== TEST DIRECT PENTRU NOTIFICĂRI EMAIL ===');
  
  // Creăm un service provider de test
  const testServiceProvider = {
    id: 999,
    companyName: 'Service Auto Test',
    email: 'nkln.service@gmail.com' // Adresa reală de email pentru test
  };
  
  // Test de trimitere notificare cerere nouă
  console.log('\n\n--- TEST NOTIFICARE CERERE NOUĂ ---');
  const requestResult = await sendNewRequestNotification(
    testServiceProvider,
    'Test reparație mașină - Direct Test',
    'Client Test Direct',
    `test_${Date.now()}`
  );
  
  // Test de trimitere notificare mesaj nou - pentru comparație
  console.log('\n\n--- TEST NOTIFICARE MESAJ NOU ---');
  const messageResult = await sendNewMessageNotification(
    testServiceProvider,
    'Acesta este un mesaj de test trimis direct prin script-ul de testare.',
    'Client Test Direct',
    'Test reparație mașină - Direct Test',
    `msg_test_${Date.now()}`
  );
  
  // Raport final
  console.log('\n\n=== RAPORT FINAL ===');
  console.log(`Notificare cerere nouă: ${requestResult ? '✅ SUCCES' : '❌ EȘEC'}`);
  console.log(`Notificare mesaj nou: ${messageResult ? '✅ SUCCES' : '❌ EȘEC'}`);
}

// Executăm testul
main().catch(error => {
  console.error('Eroare în script-ul de test:', error);
});