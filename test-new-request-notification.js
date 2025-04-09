
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
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('❌ URL-ul bazei de date nu este configurat!');
  console.error('Setați variabila de mediu DATABASE_URL');
  process.exit(1);
}

async function testNewRequestNotification() {
  console.log('🧪 === TEST NOTIFICARE CERERE NOUĂ ===');
  
  const pool = new Pool({
    connectionString: DATABASE_URL
  });
  
  try {
    // Obținem un service provider real din baza de date
    const serviceResult = await pool.query('SELECT * FROM service_providers LIMIT 1');
    
    if (serviceResult.rows.length === 0) {
      console.error('❌ Nu s-a găsit niciun furnizor de servicii în baza de date!');
      process.exit(1);
    }
    
    const serviceProvider = serviceResult.rows[0];
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
    const requestTitle = 'Schimb ulei și filtre - TEST AUTOMATIZAT';
    const requestId = `test_${Date.now()}`;
    
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
