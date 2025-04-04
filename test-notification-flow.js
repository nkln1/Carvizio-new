/**
 * Script de testare pentru fluxul de notificări
 * Simulează crearea unui mesaj nou și urmărește fluxul de trimitere email
 */

import pg from 'pg';
import fetch from 'node-fetch';
import { EmailService } from './server/services/emailService.js';

const { Pool } = pg;

// Conexiune la baza de date
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    console.log('=== TEST FLUX NOTIFICĂRI EMAIL ===\n');
    
    // 1. Preluăm un service provider din baza de date pentru test
    console.log('1. Obținem detalii service provider pentru test...');
    const serviceProviderResult = await pool.query(
      'SELECT * FROM "service_providers" WHERE id = 1'
    );
    
    if (serviceProviderResult.rows.length === 0) {
      console.error('Nu a fost găsit niciun service provider cu ID 1');
      return;
    }
    
    const serviceProvider = serviceProviderResult.rows[0];
    console.log(`Service provider găsit: ${serviceProvider.company_name} (${serviceProvider.email})`);
    
    // 2. Preluăm un client pentru test
    console.log('\n2. Obținem detalii client pentru test...');
    const clientResult = await pool.query(
      'SELECT * FROM "clients" WHERE id = 1'
    );
    
    if (clientResult.rows.length === 0) {
      console.error('Nu a fost găsit niciun client cu ID 1');
      return;
    }
    
    const client = clientResult.rows[0];
    console.log(`Client găsit: ${client.name} (${client.email})`);
    
    // 3. Preluăm o cerere pentru test
    console.log('\n3. Obținem detalii cerere pentru test...');
    const requestResult = await pool.query(
      'SELECT * FROM "requests" LIMIT 1'
    );
    
    if (requestResult.rows.length === 0) {
      console.error('Nu a fost găsită nicio cerere în baza de date');
      return;
    }
    
    const request = requestResult.rows[0];
    console.log(`Cerere găsită: ${request.title} (ID: ${request.id})`);
    
    // 4. Verificăm preferințele de notificare ale service provider-ului
    console.log('\n4. Verificăm preferințele de notificare...');
    const preferencesResult = await pool.query(
      'SELECT * FROM "notification_preferences" WHERE user_id = $1 AND user_type = $2',
      [serviceProvider.id, 'service']
    );
    
    let preferences = null;
    if (preferencesResult.rows.length > 0) {
      preferences = preferencesResult.rows[0];
      console.log('Preferințe găsite:');
      console.log(`- Notificări email activate: ${preferences.email_notifications_enabled ? 'DA' : 'NU'}`);
      console.log(`- Notificări mesaje noi: ${preferences.new_message_email_enabled ? 'DA' : 'NU'}`);
    } else {
      console.log('Nu există preferințe în baza de date, se vor folosi valorile implicite (toate notificările activate)');
    }
    
    // 5. Simulăm trimiterea unui mesaj nou
    console.log('\n5. Simulăm trimiterea unui mesaj nou...');
    
    // Adaptează obiectul serviceProvider pentru a se potrivi cu ce așteaptă EmailService
    const adaptedServiceProvider = {
      id: serviceProvider.id,
      companyName: serviceProvider.company_name,
      email: serviceProvider.email,
      phone: serviceProvider.phone
    };
    
    const messageContent = "Acesta este un mesaj de test pentru verificarea notificărilor prin email.";
    const clientName = client.name;
    const requestTitle = request.title || "Cerere service auto";
    const messageId = `test_message_${Date.now()}`;
    
    console.log('Detalii mesaj:');
    console.log(`- Expeditor: ${clientName}`);
    console.log(`- Destinatar: ${adaptedServiceProvider.companyName} (${adaptedServiceProvider.email})`);
    console.log(`- Referitor la: ${requestTitle}`);
    console.log(`- Conținut: ${messageContent}`);
    console.log(`- ID Mesaj: ${messageId}`);
    
    // 6. Trimitem notificarea prin email
    console.log('\n6. Trimitem notificarea prin email...');
    
    // Verificăm dacă trebuie să trimitem emailul conform preferințelor
    const shouldSendEmail = !preferences || 
      (preferences.email_notifications_enabled && preferences.new_message_email_enabled);
      
    console.log(`Decizie de trimitere email: ${shouldSendEmail ? 'DA' : 'NU'}`);
    
    if (shouldSendEmail) {
      try {
        console.log('Se trimite notificarea prin email...');
        const result = await EmailService.sendNewMessageNotification(
          adaptedServiceProvider,
          messageContent,
          clientName,
          requestTitle,
          messageId
        );
        
        if (result) {
          console.log('✅ Email de notificare trimis cu succes!');
        } else {
          console.error('❌ Trimiterea email-ului a eșuat.');
        }
      } catch (error) {
        console.error('❌ Eroare la trimiterea email-ului:', error);
      }
    } else {
      console.log('Trimiterea email-ului a fost omisă conform preferințelor utilizatorului.');
    }
    
    console.log('\n=== TEST FINALIZAT ===');
    console.log('Verificați adresa de email a service provider-ului pentru a confirma primirea notificării.');
    
  } catch (error) {
    console.error('Eroare în timpul testului:', error);
  } finally {
    // Închidem conexiunea la baza de date
    await pool.end();
  }
}

main();