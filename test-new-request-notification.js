
/**
 * Script pentru testarea notificărilor prin email pentru cereri noi
 * Acest script va simula trimiterea unui email de notificare pentru o cerere nouă
 * pentru un furnizor de servicii specific
 */

// Importăm EmailService
const { EmailService } = require('./server/services/emailService');

// Obținem API key din variabilele de mediu
const ELASTIC_EMAIL_API_KEY = process.env.ELASTIC_EMAIL_API_KEY;

if (!ELASTIC_EMAIL_API_KEY) {
  console.error('❌ API key pentru Elastic Email nu este configurat!');
  console.error('Setați variabila de mediu ELASTIC_EMAIL_API_KEY');
  process.exit(1);
}

async function testNewRequestNotification() {
  console.log('🧪 === TEST NOTIFICARE CERERE NOUĂ ===');
  
  // Definim un furnizor de servicii de test
  const serviceProvider = {
    id: 999,
    companyName: 'Auto Service Test',
    email: 'notificari@carvizio.ro', // Folosim adresa de test
    phone: '0712345678'
  };
  
  const requestTitle = 'Schimb ulei și filtre - TEST';
  const clientName = 'Client Test';
  const requestId = `test_${Date.now()}`;
  
  console.log(`Trimitere notificare cerere nouă către: ${serviceProvider.companyName} (${serviceProvider.email})`);
  console.log(`Titlu cerere: ${requestTitle}`);
  console.log(`Client: ${clientName}`);
  
  try {
    const result = await EmailService.sendNewRequestNotification(
      serviceProvider,
      requestTitle,
      clientName,
      requestId
    );
    
    console.log(`📧 Rezultat: ${result ? '✅ SUCCES' : '❌ EȘEC'}`);
  } catch (error) {
    console.error('❌ Eroare la testarea notificării pentru cerere nouă:', error);
  }
}

// Rulăm testul
testNewRequestNotification()
  .then(() => {
    console.log('🧪 Test finalizat!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Eroare la rularea testului:', error);
    process.exit(1);
  });
