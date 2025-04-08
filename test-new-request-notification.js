
require('dotenv').config();
const { Pool } = require('pg');
const { EmailService } = require('./server/services/emailService');

async function main() {
  console.log('=== TEST NOTIFICARE EMAIL PENTRU CERERE NOUĂ ===\n');
  
  try {
    // Verificare API key Elastic Email
    console.log('Verificare configurare Elastic Email:');
    const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
    const fromEmail = EmailService.getFromEmail();
    
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
    
    // Obține service provider-ul pentru test
    console.log('\nObținere service provider pentru test...');
    const spResult = await pool.query('SELECT * FROM service_providers WHERE id = 1');
    
    if (spResult.rows.length === 0) {
      console.error('Nu s-a găsit service provider-ul specificat!');
      process.exit(1);
    }
    
    const serviceProviderData = spResult.rows[0];
    console.log(`Service provider găsit: ${serviceProviderData.company_name}`);
    console.log(`- Email: ${serviceProviderData.email}`);
    
    // Adaptăm obiectul pentru EmailService
    const serviceProvider = {
      id: serviceProviderData.id,
      companyName: serviceProviderData.company_name,
      email: serviceProviderData.email,
      phone: serviceProviderData.phone
    };
    
    // Verificăm preferințele de notificări pentru acest service provider
    console.log('\nVerificare preferințe notificări:');
    const prefResult = await pool.query(
      'SELECT * FROM notification_preferences WHERE service_provider_id = $1',
      [serviceProvider.id]
    );
    
    let emailEnabled = true;
    let requestEnabled = true;
    
    if (prefResult.rows.length > 0) {
      const prefs = prefResult.rows[0];
      emailEnabled = prefs.email_notifications_enabled;
      requestEnabled = prefs.new_request_email_enabled;
      
      console.log(`- Email notificări active: ${emailEnabled ? 'DA' : 'NU'}`);
      console.log(`- Notificări cerere nouă: ${requestEnabled ? 'DA' : 'NU'}`);
      console.log(`- Ar trebui să trimită email: ${(emailEnabled && requestEnabled) ? 'DA' : 'NU'}`);
    } else {
      console.log('Nu s-au găsit preferințe specifice. Se folosesc valorile implicite (toate active).');
    }
    
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
    
    console.log(`Rezultat trimitere email: ${requestResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    await pool.end();
    
    console.log('\n=== TEST FINALIZAT ===');
  } catch (error) {
    console.error('❌ EROARE ÎN TIMPUL TESTULUI:', error);
    process.exit(1);
  }
}

main().catch(console.error);
