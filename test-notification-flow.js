/**
 * Script de testare pentru fluxul de notificări
 * Simulează crearea unui mesaj nou și urmărește fluxul de trimitere email
 */

import { EmailService } from './emailService.js';
import pg from 'pg';
const { Pool } = pg;

async function main() {
  console.log('=== TEST FLUX COMPLET NOTIFICĂRI EMAIL ===');
  console.log('Acest test simulează fluxul complet de trimitere a notificărilor prin email\n');

  try {
    // Conectare la baza de date
    console.log('Conectare la baza de date...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Obținem un service provider activ
    console.log('\nCăutare service provider pentru test...');
    const result = await pool.query(`
      SELECT sp.*, np.* 
      FROM service_providers sp
      LEFT JOIN notification_preferences np ON sp.id = np.service_provider_id
      WHERE sp.id = 1
    `);
    
    if (result.rows.length === 0) {
      console.error('❌ Nu s-a găsit service provider-ul cu ID 1 în baza de date');
      return;
    }
    
    const spData = result.rows[0];
    
    // Construim obiectul service provider pentru EmailService
    const serviceProvider = {
      id: spData.id,
      email: spData.email,
      companyName: spData.company_name,
      phone: spData.phone
    };
    
    console.log(`✅ Găsit service provider: ${serviceProvider.companyName} (ID: ${serviceProvider.id})`);
    console.log(`📧 Email: ${serviceProvider.email}`);
    
    // Verificăm preferințele de notificare pentru mesaje
    const emailNotificationsEnabled = spData.email_notifications_enabled !== false; // default true
    const newMessageEmailEnabled = spData.new_message_email_enabled !== false; // default true
    
    console.log('\nVerificare preferințe notificare:');
    console.log(`- Notificări email activate: ${emailNotificationsEnabled ? 'DA' : 'NU'}`);
    console.log(`- Notificări pentru mesaje noi: ${newMessageEmailEnabled ? 'DA' : 'NU'}`);
    
    if (!emailNotificationsEnabled || !newMessageEmailEnabled) {
      console.log('⚠️ Notificările pentru mesaje noi sunt dezactivate în preferințe!');
      console.log('Continuăm totuși testul pentru a verifica funcționalitatea...');
    }
    
    // Simulăm trimiterea unui mesaj nou
    console.log('\n1️⃣ Simulare MESAJ NOU...');
    
    // Pregătim datele pentru mesaj
    const messageId = `test_message_${Date.now()}`;
    const messageContent = 'Acesta este un mesaj de test pentru verificarea fluxului de notificări.';
    const senderName = 'Client Test Automat';
    const requestTitle = 'Cerere Test Notificări';
    
    console.log(`- ID Mesaj: ${messageId}`);
    console.log(`- Conținut: ${messageContent}`);
    console.log(`- Expeditor: ${senderName}`);
    console.log(`- Cerere asociată: ${requestTitle}`);
    
    // 2. Trimitem notificare prin email
    console.log('\n2️⃣ Trimitere NOTIFICARE EMAIL...');
    
    // Verificăm existența API key-ului ElasticEmail
    const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
    if (!apiKey) {
      console.error('❌ API KEY Elastic Email lipsește! Notificările nu vor fi trimise.');
      process.exit(1);
    }
    
    console.log(`- API Key Elastic Email: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`- Expeditor: ${EmailService.getFromEmail()} (${EmailService.getFromName()})`);
    
    // Trimitem notificarea de mesaj nou
    const emailResult = await EmailService.sendNewMessageNotification(
      serviceProvider,
      messageContent,
      senderName,
      requestTitle,
      messageId,
      'Test direct din script test-notification-flow.js'
    );
    
    if (emailResult) {
      console.log('✅ Notificare email trimisă cu SUCCES!');
      console.log(`📧 Verificați adresa ${serviceProvider.email} pentru a confirma primirea email-ului.`);
    } else {
      console.error('❌ Eroare la trimiterea notificării prin email!');
    }
    
    // 3. Verificăm dacă a fost trimis email-ul verificând tabelul trimise_emails
    console.log('\n3️⃣ Verificare înregistrare email în baza de date...');
    try {
      const emailCheckResult = await pool.query(`
        SELECT * FROM sent_emails 
        WHERE recipient = $1 AND message_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `, [serviceProvider.email, messageId]);
      
      if (emailCheckResult.rows.length > 0) {
        const emailRecord = emailCheckResult.rows[0];
        console.log(`✅ Email găsit în baza de date:`);
        console.log(`- ID: ${emailRecord.id}`);
        console.log(`- Destinatar: ${emailRecord.recipient}`);
        console.log(`- Subiect: ${emailRecord.subject}`);
        console.log(`- Trimis la: ${emailRecord.created_at}`);
        console.log(`- Status API: ${emailRecord.api_response}`);
      } else {
        console.log('⚠️ Nu s-a găsit înregistrarea email-ului în baza de date.');
        console.log('Posibile cauze:');
        console.log('- Email-ul a fost trimis, dar nu a fost înregistrat în baza de date');
        console.log('- Tabelul sent_emails nu există în baza de date');
        console.log('- O eroare a împiedicat trimiterea email-ului');
      }
    } catch (error) {
      console.log(`⚠️ Nu s-a putut verifica tabelul sent_emails: ${error.message}`);
      console.log('Cel mai probabil tabelul nu există în baza de date.');
    }
    
    // Sumar final
    console.log('\n=== SUMAR FINAL ===');
    console.log(`Service Provider: ${serviceProvider.companyName} (ID: ${serviceProvider.id})`);
    console.log(`Email: ${serviceProvider.email}`);
    console.log(`Notificări email activate: ${emailNotificationsEnabled ? 'DA' : 'NU'}`);
    console.log(`Notificări pentru mesaje noi: ${newMessageEmailEnabled ? 'DA' : 'NU'}`);
    console.log(`Rezultat trimitere email: ${emailResult ? 'SUCCES' : 'EȘEC'}`);
    
    // Închide conexiunea la baza de date
    await pool.end();
    
  } catch (error) {
    console.error('❌ EROARE ÎN TIMPUL TESTULUI:', error);
    process.exit(1);
  }
  
  console.log('\n=== TEST COMPLET ===');
}

main().catch(console.error);