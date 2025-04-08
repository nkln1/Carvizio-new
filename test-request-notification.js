
/**
 * Script de test pentru verificarea notificărilor de cereri noi
 * Acest script testează trimiterea de notificări push și email pentru cereri noi
 */

import fetch from 'node-fetch';
import pg from 'pg';
import { EmailService } from './server/services/emailService.js';

const { Pool } = pg;

async function main() {
  console.log('=== TEST NOTIFICĂRI PENTRU CERERI NOI ===');
  
  // Configurare conexiune bază de date
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Obținem un service provider din baza de date pentru testare
    const result = await pool.query(
      'SELECT * FROM service_providers LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.error('Nu există service providers în baza de date pentru testare');
      return;
    }
    
    const serviceProvider = result.rows[0];
    console.log(`\nTest notificări pentru service provider: ${serviceProvider.company_name} (${serviceProvider.email})`);
    
    // Adaptăm obiectul pentru a corespunde așteptărilor EmailService
    const adaptedServiceProvider = {
      id: serviceProvider.id,
      companyName: serviceProvider.company_name,
      email: serviceProvider.email,
      phone: serviceProvider.phone
    };
    
    // Obține preferințele de notificare
    const prefsResult = await pool.query(
      'SELECT * FROM notification_preferences WHERE service_provider_id = $1',
      [serviceProvider.id]
    );
    
    let emailNotificationsEnabled = true;
    let newRequestEmailEnabled = true;
    
    if (prefsResult.rows.length > 0) {
      const prefs = prefsResult.rows[0];
      emailNotificationsEnabled = prefs.email_notifications_enabled !== false;
      newRequestEmailEnabled = prefs.new_request_email_enabled !== false;
      
      console.log('\nPreferințe notificări:');
      console.log(`- Email notificări activate: ${emailNotificationsEnabled ? 'DA' : 'NU'}`);
      console.log(`- Notificări cerere nouă: ${newRequestEmailEnabled ? 'DA' : 'NU'}`);
    } else {
      console.log('\nNu există preferințe setate. Se folosesc valorile implicite (toate notificările activate).');
    }
    
    if (!emailNotificationsEnabled || !newRequestEmailEnabled) {
      console.log('⚠️ Notificările email pentru cereri noi sunt dezactivate în preferințele utilizatorului!');
    }
    
    // Testare 1: Trimitere email direct prin EmailService
    console.log('\n1️⃣ Test trimitere email direct prin EmailService...');
    
    const requestId = `test_request_${Date.now()}`;
    const requestTitle = 'Test Cerere Nouă - Direct prin EmailService';
    const clientName = 'Client Test';
    
    console.log(`- ID Cerere: ${requestId}`);
    console.log(`- Titlu: ${requestTitle}`);
    console.log(`- Client: ${clientName}`);
    
    const emailResult = await EmailService.sendNewRequestNotification(
      adaptedServiceProvider,
      requestTitle,
      clientName,
      requestId
    );
    
    console.log(`Rezultat trimitere email direct: ${emailResult ? '✅ SUCCES' : '❌ EȘEC'}`);
    
    // Testare 2: Trimitere notificare prin API
    console.log('\n2️⃣ Test trimitere notificare prin API...');
    
    const apiRequestId = `api_request_${Date.now()}`;
    const apiRequestTitle = 'Test Cerere Nouă - Prin API Notificări';
    
    try {
      const apiResponse = await fetch('http://localhost:3001/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: [serviceProvider.id],
          userRole: 'service',
          title: `Cerere nouă: ${apiRequestTitle}`,
          body: `Aveți o cerere nouă de la Client Test API`,
          data: {
            type: 'NEW_REQUEST',
            payload: {
              id: apiRequestId,
              title: apiRequestTitle,
              clientName: 'Client Test API'
            }
          }
        })
      });
      
      const apiResponseData = await apiResponse.json();
      console.log(`Rezultat API: ${apiResponse.status === 200 ? '✅ SUCCES' : '❌ EȘEC'}`);
      console.log('Răspuns API:', apiResponseData);
    } catch (apiError) {
      console.error('Eroare la apelul API:', apiError);
    }
    
    console.log('\n✅ Teste finalizate. Verificați emailul pentru notificări.');
  } catch (error) {
    console.error('Eroare în timpul testului:', error);
  } finally {
    await pool.end();
  }
}

main();
