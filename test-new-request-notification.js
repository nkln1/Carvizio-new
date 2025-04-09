
/**
 * Script de test pentru notificări de cerere nouă
 * Util pentru debugging
 */

const fetch = require('node-fetch');
const { EmailService } = require('./server/services/emailService');

// Funcție pentru testarea directă a notificării de cerere nouă
async function testNewRequestNotification() {
  console.log('Test direct de notificare pentru cerere nouă');

  // Verifică configurarea EmailService
  console.log('Configurare EmailService:');
  console.log('- API key prezent:', !!process.env.ELASTIC_EMAIL_API_KEY);
  console.log('- From email:', EmailService.getFromEmail());
  
  if (!process.env.ELASTIC_EMAIL_API_KEY) {
    console.error('EROARE: API key lipsește. Verificați variabila de mediu ELASTIC_EMAIL_API_KEY');
    return false;
  }

  // Date pentru testare - înlocuiți cu datele reale
  const testServiceProvider = {
    id: 1, // service provider ID
    companyName: 'Service Test',
    email: 'notificari@carvizio.ro', // adresa de email de test
    phone: '0722223333'
  };

  const requestTitle = 'Test Notificare Cerere Nouă';
  const clientName = 'Client Test';
  const requestId = `test_request_${Date.now()}`;

  console.log('\nTrimitere notificare cerere nouă:');
  console.log('- Destinatar:', testServiceProvider.email);
  console.log('- Titlu cerere:', requestTitle);
  console.log('- Client:', clientName);
  console.log('- Request ID:', requestId);

  try {
    // Testare cu EmailService
    console.log('\n1. Test utilizând EmailService.sendNewRequestNotification:');
    const result = await EmailService.sendNewRequestNotification(
      testServiceProvider,
      requestTitle,
      clientName,
      requestId
    );
    
    console.log('Rezultat test EmailService:', result ? 'SUCCES' : 'EȘEC');

    // Testare directă cu API
    console.log('\n2. Test utilizând direct API-ul ElasticEmail:');
    const params = new URLSearchParams();
    params.append('apikey', process.env.ELASTIC_EMAIL_API_KEY);
    params.append('to', testServiceProvider.email);
    params.append('from', 'notificari@carvizio.ro');
    params.append('fromName', 'Auto Service App');
    params.append('subject', `Cerere nouă: ${requestTitle} [${requestId}]`);
    
    // HTML pentru email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a5568;">Cerere nouă de service</h2>
        <p>Bună ziua, ${testServiceProvider.companyName},</p>
        <p>Ați primit o cerere nouă de service de la <strong>${clientName}</strong>:</p>
        <div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${requestTitle}</h3>
        </div>
        <p>Puteți vizualiza detaliile complete ale cererii și răspunde direct din contul dvs.</p>
        <p>Acesta este un email de test pentru verificarea funcționalității notificărilor.</p>
        <!-- ID Cerere: ${requestId} - Folosit pentru prevenirea duplicării -->
      </div>
    `;
    
    params.append('bodyHtml', html);
    
    const response = await fetch('https://api.elasticemail.com/v2/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    
    const responseData = await response.text();
    console.log('Status API:', response.status, response.statusText);
    console.log('Răspuns API:', responseData);
    
    return result;
  } catch (error) {
    console.error('EROARE la testarea notificării:', error);
    return false;
  }
}

// Rulăm testul
testNewRequestNotification()
  .then(result => {
    console.log('\nRezultat final test:', result ? 'SUCCES' : 'EȘEC');
    process.exit(result ? 0 : 1);
  })
  .catch(err => {
    console.error('Eroare neprevăzută:', err);
    process.exit(1);
  });


/**
 * Script pentru testarea notificărilor prin email pentru cereri noi
 * Acest script va simula trimiterea unui email de notificare pentru o cerere nouă
 * pentru un furnizor de servicii specific
 */
const { Pool } = require('pg');
const { EmailService } = require('./server/services/emailService');

// Obținem API key din variabilele de mediu
const ELASTIC_EMAIL_API_KEY = process.env.ELASTIC_EMAIL_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!ELASTIC_EMAIL_API_KEY) {
  console.error('❌ API key pentru Elastic Email nu este configurat!');
  console.error('Setați variabila de mediu ELASTIC_EMAIL_API_KEY');
  // Afișăm variabilele de mediu disponibile pentru a ajuta la debugging
  console.log('Variabile de mediu disponibile:', Object.keys(process.env).filter(key => 
    !key.includes('SECRET') && !key.includes('KEY') && !key.includes('TOKEN')).join(', '));
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('❌ URL-ul bazei de date nu este configurat!');
  console.error('Setați variabila de mediu DATABASE_URL');
  process.exit(1);
}

async function testNewRequestNotification() {
  console.log('🧪 === TEST NOTIFICARE CERERE NOUĂ ===');
  console.log('📋 Informații API Email:');
  console.log(`- API Key configurat: ${!!ELASTIC_EMAIL_API_KEY}`);
  console.log(`- API Key trunchiat: ${ELASTIC_EMAIL_API_KEY.substring(0, 4)}...${ELASTIC_EMAIL_API_KEY.substring(ELASTIC_EMAIL_API_KEY.length - 4)}`);
  
  const pool = new Pool({
    connectionString: DATABASE_URL
  });
  
  try {
    // Verificăm dacă serviciul de email poate trimite email-uri
    console.log('\n🧪 Test conexiune API Elastic Email...');
    
    try {
      // Test direct al metodei sendEmail
      const testResult = await EmailService.sendEmail(
        'test-auto-service@example.com', // Adresa de email pentru test
        'Test conexiune API Elastic Email',
        '<h1>Test de conexiune</h1><p>Acest email este doar un test al API-ului.</p>',
        'Test de conexiune. Acest email este doar un test al API-ului.',
        'TEST_CONNECTION'
      );
      
      console.log(`📧 Test direct sendEmail: ${testResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    } catch (testError) {
      console.error('❌ Eroare la testul direct al API-ului:', testError);
    }
    
    // Obținem un service provider real din baza de date
    console.log('\n🔍 Căutare furnizori de servicii în baza de date...');
    const serviceResult = await pool.query('SELECT * FROM service_providers LIMIT 5');
    
    if (serviceResult.rows.length === 0) {
      console.error('❌ Nu s-a găsit niciun furnizor de servicii în baza de date!');
      process.exit(1);
    }
    
    console.log(`🔍 Găsiți ${serviceResult.rows.length} furnizori de servicii`);
    
    // Selectăm toți furnizorii și testăm pentru fiecare
    for (let i = 0; i < serviceResult.rows.length; i++) {
      const serviceProvider = serviceResult.rows[i];
      
      console.log(`\n🧪 TEST #${i+1}: ${serviceProvider.company_name} (${serviceProvider.email})`);
      
      // Verifică dacă adresa de email este validă
      if (!serviceProvider.email || !serviceProvider.email.includes('@')) {
        console.log(`❌ Adresă de email invalidă: ${serviceProvider.email}`);
        continue;
      }
      
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
        
        // Verificăm dacă notificările prin email sunt active
        if (!prefs.email_notifications_enabled || !prefs.new_request_email_enabled) {
          console.log('\n⚠️ Atenție: Notificările pentru cereri noi sunt dezactivate în preferințe!');
          console.log('Pentru acest test, vom ignora preferințele și vom încerca să trimitem email-ul oricum.');
        }
      } else {
        console.log('Nu există preferințe setate. Se vor folosi valorile implicite (toate notificările activate).');
      }
      
      // Obținem un client real din baza de date
      const clientResult = await pool.query('SELECT * FROM clients LIMIT 1');
      
      if (clientResult.rows.length === 0) {
        console.error('❌ Nu s-a găsit niciun client în baza de date!');
        process.exit(1);
      }
      
      const client = clientResult.rows[0];
      console.log(`\nClient pentru simulare: ${client.name} (${client.email})`);
      
      // Simulăm o cerere nouă
      const requestTitle = `Schimb ulei și filtre - TEST #${i+1} AUTOMATIZAT`;
      const requestId = `test_${Date.now()}_${i}`;
      
      console.log(`\nSimulare cerere nouă:`);
      console.log(`- Titlu: ${requestTitle}`);
      console.log(`- ID: ${requestId}`);
      console.log(`- Client: ${client.name}`);
      console.log(`- Furnizor servicii: ${adaptedServiceProvider.companyName}`);
      
      console.log('\nTrimitere notificare prin email...');
      
      try {
        const result = await EmailService.sendNewRequestNotification(
          adaptedServiceProvider,
          requestTitle,
          client.name,
          requestId
        );
        
        console.log(`📧 Rezultat: ${result ? '✅ SUCCES' : '❌ EȘEC'}`);
        
        if (result) {
          console.log(`\n✅ Email-ul a fost trimis cu succes către ${adaptedServiceProvider.email}`);
          console.log('Verificați căsuța de email pentru a confirma primirea notificării.');
        } else {
          console.error(`\n❌ Nu s-a putut trimite email-ul către ${adaptedServiceProvider.email}`);
          console.error('Verificați jurnalele serverului pentru mai multe detalii.');
        }
      } catch (error) {
        console.error('❌ Eroare la trimiterea email-ului:', error);
      }
    }
  } catch (error) {
    console.error('❌ Eroare generală:', error);
  } finally {
    await pool.end();
  }
}

// Rulăm testul
testNewRequestNotification()
  .then(() => {
    console.log('\n🧪 Test finalizat!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Eroare la rularea testului:', error);
    process.exit(1);
  });
