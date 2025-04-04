/**
 * Script de testare pentru sistemul de notificări prin email
 * 
 * Acest script verifică:
 * 1. Conexiunea la API-ul Elastic Email
 * 2. Recuperarea datelor service provider-ului din baza de date
 * 3. Verificarea preferințelor de notificare
 * 4. Trimiterea directă a unui email de test pentru fiecare tip de notificare
 */

// Folosim require pentru toate modulele (CommonJS)
const { EmailService } = require('./server/services/emailService');
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const schema = require('./shared/schema');

// Conexiune la baza de date folosind aceleași setări ca în aplicație
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

async function main() {
  console.log('=== SISTEM TESTARE NOTIFICĂRI EMAIL ===');

  try {
    // Pas 1: Verificăm conexiunea la API-ul Elastic Email
    console.log('\n🔍 Verificare configurare ElasticEmail:');
    console.log(`- API URL: ${EmailService.getBaseUrl()}`);
    console.log(`- Email expeditor: ${EmailService.getFromEmail()}`);
    console.log('- API Key configurată:', !!process.env.ELASTIC_EMAIL_API_KEY);
    if (process.env.ELASTIC_EMAIL_API_KEY) {
      const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
      console.log(`- API Key primele/ultimele caractere: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    } else {
      console.error('⚠️ API KEY LIPSĂ - Notificările email nu vor funcționa!');
    }

    // Pas 2: Obținem date despre service provider cu ID 1
    console.log('\n🔍 Obținere date service provider (ID: 1):');
    const serviceProviders = await db.select().from(schema.serviceProvidersTable).where(eq(schema.serviceProvidersTable.id, 1));
    
    if (!serviceProviders || serviceProviders.length === 0) {
      throw new Error('Service provider cu ID 1 nu a fost găsit în baza de date');
    }
    
    const serviceProvider = serviceProviders[0];
    console.log(`- Nume companie: ${serviceProvider.companyName}`);
    console.log(`- Email: ${serviceProvider.email}`);
    console.log(`- Telefon: ${serviceProvider.phone}`);

    // Pas 3: Obținem preferințele de notificare
    console.log('\n🔍 Verificare preferințe notificare:');
    const preferences = await db.select().from(schema.notificationPreferencesTable).where(eq(schema.notificationPreferencesTable.serviceProviderId, 1));
    
    if (!preferences || preferences.length === 0) {
      console.log('⚠️ Nu există preferințe configurate în baza de date. Se folosesc valorile implicite (toate notificările active)');
    } else {
      const prefs = preferences[0];
      console.log(`- Email notificări activate: ${prefs.emailNotificationsEnabled ? 'DA' : 'NU'}`);
      console.log(`- Notificări cerere nouă: ${prefs.newRequestEmailEnabled ? 'DA' : 'NU'}`);
      console.log(`- Notificări ofertă acceptată: ${prefs.acceptedOfferEmailEnabled ? 'DA' : 'NU'}`);
      console.log(`- Notificări mesaj nou: ${prefs.newMessageEmailEnabled ? 'DA' : 'NU'}`);
      console.log(`- Notificări recenzie nouă: ${prefs.newReviewEmailEnabled ? 'DA' : 'NU'}`);
    }

    // Pas 4: Trimitem email-uri de test direct pentru fiecare tip
    console.log('\n✉️ Trimitere email-uri de test:');
    
    // Email test pentru cerere nouă
    console.log('\n⏳ Test notificare CERERE NOUĂ...');
    const requestResult = await EmailService.sendNewRequestNotification(
      serviceProvider,
      'Test cerere service auto',
      'Client Test'
    );
    console.log(`✅ Rezultat test cerere nouă: ${requestResult ? 'SUCCES' : 'EȘEC'}`);
    
    // Email test pentru ofertă acceptată
    console.log('\n⏳ Test notificare OFERTĂ ACCEPTATĂ...');
    const offerResult = await EmailService.sendOfferAcceptedNotification(
      serviceProvider,
      'Test ofertă service auto',
      'Client Test'
    );
    console.log(`✅ Rezultat test ofertă acceptată: ${offerResult ? 'SUCCES' : 'EȘEC'}`);
    
    // Email test pentru mesaj nou
    console.log('\n⏳ Test notificare MESAJ NOU...');
    const messageResult = await EmailService.sendNewMessageNotification(
      serviceProvider,
      'Acesta este un mesaj de test pentru a verifica funcționalitatea notificărilor prin email.',
      'Client Test',
      'Cerere service test'
    );
    console.log(`✅ Rezultat test mesaj nou: ${messageResult ? 'SUCCES' : 'EȘEC'}`);
    
    // Email test pentru recenzie nouă
    console.log('\n⏳ Test notificare RECENZIE NOUĂ...');
    const reviewResult = await EmailService.sendNewReviewNotification(
      serviceProvider,
      'Client Test',
      4,
      'Acesta este un text de recenzie de test pentru a verifica funcționalitatea notificărilor prin email. Serviciu excelent, recomand!'
    );
    console.log(`✅ Rezultat test recenzie nouă: ${reviewResult ? 'SUCCES' : 'EȘEC'}`);

    console.log('\n✅ TESTARE COMPLETĂ');
    console.log('Verificați adresa de email a service provider-ului pentru a confirma primirea email-urilor de test.');
    
  } catch (error) {
    console.error('❌ EROARE ÎN TIMPUL TESTĂRII:', error);
  } finally {
    // Închidem conexiunea la bază de date
    await pool.end();
    console.log('\n=== SFÂRȘIT TESTARE ===');
  }
}

// Adăugăm importul necesar pentru eq
const { eq } = require('drizzle-orm');

main().catch(console.error);