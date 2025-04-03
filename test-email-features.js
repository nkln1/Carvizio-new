/**
 * Test pentru îmbunătățirile aduse la trimiterea de email-uri
 * Acest script testează noile caracteristici de trimitere a email-urilor pentru diagnosticare
 */

// Importăm modulele necesare
import fetch from 'node-fetch';

// Cheie API pentru Elastic Email
const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
const fromEmail = 'notificari@carvizio.ro';
const fromName = 'Test App Notifications';
const baseUrl = 'https://api.elasticemail.com/v2';

async function sendTestEmail(to, subject, htmlContent, messageId, debugInfo) {
  console.log(`\n[${messageId}] 📧 ===== ELASTIC EMAIL - TEST TRIMITERE EMAIL =====`);
  console.log(`[${messageId}] 🔍 Context: ${debugInfo}`);
  console.log(`[${messageId}] 📋 Detalii email:`);
  console.log(`[${messageId}]   • Destinatar:`, to);
  console.log(`[${messageId}]   • Expeditor:`, fromEmail);
  console.log(`[${messageId}]   • Nume Expeditor:`, fromName);
  console.log(`[${messageId}]   • Subiect:`, subject);
  
  const payload = {
    To: to,
    From: fromEmail,
    FromName: fromName,
    Subject: subject,
    BodyHTML: htmlContent
  };

  // Construim URL-ul cu parametrii pentru application/x-www-form-urlencoded 
  const params = new URLSearchParams();
  params.append('apikey', apiKey || '');
  params.append('to', payload.To);
  params.append('from', payload.From);
  params.append('fromName', payload.FromName || '');
  params.append('subject', payload.Subject);
  params.append('bodyHtml', payload.BodyHTML);

  console.log(`[${messageId}] 🔄 Trimitere cerere către API...`);
  
  let startTime = Date.now();
  const response = await fetch(`${baseUrl}/email/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-ElasticEmail-ApiKey': apiKey || ''
    },
    body: params
  });
  let endTime = Date.now();
  
  console.log(`[${messageId}] ⏱️ Durata cerere API: ${endTime - startTime}ms`);
  console.log(`[${messageId}] 📊 Răspuns primit: [${response.status}] ${response.statusText}`);
  
  const contentType = response.headers.get('content-type');
  console.log(`[${messageId}] 📄 Content-Type răspuns:`, contentType);

  if (!response.ok) {
    console.log(`[${messageId}] ❌ Răspuns cu eroare de la API`);
    let errorData;
    try {
      // Încercăm să parsăm răspunsul ca JSON dacă este posibil
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
        console.error(`[${messageId}] 🚫 Eroare JSON de la API:`, JSON.stringify(errorData, null, 2));
      } else {
        // Altfel obținem textul răspunsului
        errorData = await response.text();
        console.error(`[${messageId}] 🚫 Eroare text de la API:`, errorData);
      }
    } catch (parseError) {
      console.error(`[${messageId}] 🚫 Eroare la parsarea răspunsului de eroare:`, parseError);
      errorData = 'Nu am putut parsa răspunsul de eroare';
    }
    
    console.error(`[${messageId}] 🚫 Eroare la trimiterea email-ului. Status:`, response.status);
    throw new Error(`Eroare API Elastic Email (${response.status}): ${JSON.stringify(errorData)}`);
  }

  // Procesare răspuns de succes
  let data;
  try {
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log(`[${messageId}] ✅ Răspuns JSON de succes:`, JSON.stringify(data, null, 2));
    } else {
      data = await response.text();
      console.log(`[${messageId}] ✅ Răspuns text de succes:`, data);
    }
  } catch (parseError) {
    console.warn(`[${messageId}] ⚠️ Nu am putut parsa răspunsul ca JSON:`, parseError);
    data = 'Răspuns neașteptat, posibil succes dar format necunoscut';
  }
  
  console.log(`[${messageId}] ✅ Email trimis cu succes!`);
  console.log(`[${messageId}] 📧 ===== SFÂRȘIT TRIMITERE EMAIL =====\n`);
  return data;
}

// Trimite un email de test pentru verificarea noi parametri
async function testNewParams() {
  const testId = `test_${Date.now()}`;
  const debugInfo = "[TEST] Verificare trimitere cu parametri noi";
  
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #4a5568;">Test Email Unic</h1>
      <p>Acesta este un email de test pentru a verifica noile îmbunătățiri de trimitere a email-urilor.</p>
      <p>ID Test: <strong>${testId}</strong></p>
      <p>Timestamp: <strong>${new Date().toISOString()}</strong></p>
      <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
        Acest email a fost trimis automat pentru testare.
      </p>
    </div>
  `;
  
  try {
    const result = await sendTestEmail(
      'nkln@yahoo.com', 
      `Test Email Unic [${testId}]`, 
      emailContent,
      testId,
      debugInfo
    );
    console.log("Rezultat test:", result);
    return true;
  } catch (error) {
    console.error("Eroare la trimiterea email-ului de test:", error);
    return false;
  }
}

// Funcția principală
async function main() {
  console.log("=== Test pentru noile caracteristici de email ===");
  
  if (!apiKey) {
    console.error("API Key pentru Elastic Email nu este configurat! Setați variabila de mediu ELASTIC_EMAIL_API_KEY.");
    process.exit(1);
  }
  
  console.log("API Key Elastic Email este configurat.");
  
  try {
    // Testare trimitere email cu noii parametri
    console.log("\nTestare trimitere email cu parametri unici și debugging...");
    const testResult = await testNewParams();
    if (testResult) {
      console.log("✅ Test reușit! Email-ul a fost trimis cu succes.");
    } else {
      console.log("❌ Testul a eșuat. Verificați erorile de mai sus.");
    }
  } catch (error) {
    console.error("Eroare în timpul testelor:", error);
  }
  
  console.log("\n=== Sfârșit teste ===");
}

// Execută funcția principală
main().catch(error => {
  console.error("Eroare neașteptată:", error);
  process.exit(1);
});