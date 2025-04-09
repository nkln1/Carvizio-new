/**
 * Test direct pentru verificarea fixului notificărilor email cereri noi
 */

import fetch from 'node-fetch';
import { EmailService } from './emailService.js';

const serviceProvider = {
  id: 15,
  companyName: "Auto Service Test",
  email: "nkln@yahoo.com",  // Înlocuiește cu email-ul tău
  phone: "123456789"
};

async function main() {
  console.log('=== Test Fix Notificări Email pentru Cereri Noi ===\n');
  
  // Verificare API key
  const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
  console.log('API Key configurată:', !!apiKey);
  
  if (!apiKey) {
    console.error('❌ API key lipsă. Testul nu poate continua.');
    process.exit(1);
  }
  
  console.log(`API Key hash: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
  
  // Informații test
  const requestTitle = 'Test Fix Notificare Cerere Nouă';
  const clientName = 'Client Test Fix';
  const requestId = `test_${Date.now()}`;
  
  console.log('\nInformații test:');
  console.log(`- Service Provider: ${serviceProvider.companyName} (ID: ${serviceProvider.id})`);
  console.log(`- Email Service Provider: ${serviceProvider.email}`);
  console.log(`- Titlu cerere: ${requestTitle}`);
  console.log(`- Nume client: ${clientName}`);
  console.log(`- ID cerere: ${requestId}`);
  
  console.log('\nTrimitre email în curs...');
  try {
    const result = await EmailService.sendNewRequestNotification(
      serviceProvider,
      requestTitle,
      clientName,
      requestId
    );
    
    console.log(`\nRezultat trimitere email: ${result ? '✅ SUCCES' : '❌ EȘEC'}`);
  } catch (error) {
    console.error('❌ Eroare la trimiterea emailului:', error);
  }
  
  console.log('\n=== Test finalizat ===');
}

main().catch(console.error);