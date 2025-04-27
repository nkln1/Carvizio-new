/**
 * Script de testare pentru verificarea reparațiilor din sistemul de notificări prin email
 */

const fetch = require('node-fetch');

async function testServiceNotifications() {
  console.log('\n=== Testare notificări SERVICE PROVIDER ===');
  
  // Obținem un service provider pentru testare
  console.log('\n1. Obținere service provider pentru testare...');
  const spResponse = await fetch('http://localhost:5000/api/service-providers');
  const serviceProviders = await spResponse.json();
  
  if (!serviceProviders || serviceProviders.length === 0) {
    console.error('Nu am găsit furnizori de servicii pentru testare');
    return false;
  }
  
  const serviceProvider = serviceProviders[0];
  console.log(`   ✓ Am găsit service provider: ${serviceProvider.companyName} (${serviceProvider.email})`);
  
  // Testăm notificarea pentru cerere nouă
  console.log('\n2. Testare notificare CERERE NOUĂ...');
  const requestResponse = await fetch('http://localhost:5000/api/test-notifications/new-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceProviderId: serviceProvider.id,
      requestTitle: 'Testare reparare sistem notificări',
      clientName: 'Client Test'
    })
  });
  
  const requestResult = await requestResponse.json();
  if (requestResult.success) {
    console.log('   ✓ Notificare cerere nouă trimisă cu succes');
  } else {
    console.error(`   ✗ Eroare la trimiterea notificării pentru cerere nouă: ${requestResult.error}`);
  }
  
  // Testăm notificarea pentru mesaj nou
  console.log('\n3. Testare notificare MESAJ NOU...');
  const messageResponse = await fetch('http://localhost:5000/api/test-notifications/new-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceProviderId: serviceProvider.id,
      messageContent: 'Acesta este un mesaj de test pentru verificarea reparațiilor din sistemul de notificări',
      senderName: 'Client Test',
      requestOrOfferTitle: 'Cerere testare sistem'
    })
  });
  
  const messageResult = await messageResponse.json();
  if (messageResult.success) {
    console.log('   ✓ Notificare mesaj nou trimisă cu succes');
  } else {
    console.error(`   ✗ Eroare la trimiterea notificării pentru mesaj nou: ${messageResult.error}`);
  }
  
  // Testăm notificarea pentru ofertă acceptată
  console.log('\n4. Testare notificare OFERTĂ ACCEPTATĂ...');
  const offerResponse = await fetch('http://localhost:5000/api/test-notifications/offer-accepted', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceProviderId: serviceProvider.id,
      offerTitle: 'Ofertă test pentru reparații',
      clientName: 'Client Test'
    })
  });
  
  const offerResult = await offerResponse.json();
  if (offerResult.success) {
    console.log('   ✓ Notificare ofertă acceptată trimisă cu succes');
  } else {
    console.error(`   ✗ Eroare la trimiterea notificării pentru ofertă acceptată: ${offerResult.error}`);
  }
  
  // Testăm notificarea pentru recenzie nouă
  console.log('\n5. Testare notificare RECENZIE NOUĂ...');
  const reviewResponse = await fetch('http://localhost:5000/api/test-notifications/new-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceProviderId: serviceProvider.id,
      clientName: 'Client Test',
      rating: 5,
      reviewContent: 'Servicii excelente, recomand cu încredere!'
    })
  });
  
  const reviewResult = await reviewResponse.json();
  if (reviewResult.success) {
    console.log('   ✓ Notificare recenzie nouă trimisă cu succes');
  } else {
    console.error(`   ✗ Eroare la trimiterea notificării pentru recenzie nouă: ${reviewResult.error}`);
  }
  
  console.log('\n=== Testare notificări SERVICE PROVIDER finalizată ===');
  return true;
}

async function testClientNotifications() {
  console.log('\n=== Testare notificări CLIENT ===');
  
  // Obținem un client pentru testare
  console.log('\n1. Obținere client pentru testare...');
  const clientResponse = await fetch('http://localhost:5000/api/clients');
  const clients = await clientResponse.json();
  
  if (!clients || clients.length === 0) {
    console.error('Nu am găsit clienți pentru testare');
    return false;
  }
  
  const client = clients[0];
  console.log(`   ✓ Am găsit client: ${client.name} (${client.email})`);
  
  // Testăm notificarea pentru mesaj nou către client
  console.log('\n2. Testare notificare MESAJ NOU către CLIENT...');
  const messageResponse = await fetch('http://localhost:5000/api/test-notifications/client-new-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: client.id,
      messageContent: 'Acesta este un mesaj de test pentru verificarea reparațiilor din sistemul de notificări către client',
      senderName: 'Service Auto Test',
      requestOrOfferTitle: 'Cerere testare sistem'
    })
  });
  
  const messageResult = await messageResponse.json();
  if (messageResult.success) {
    console.log('   ✓ Notificare mesaj nou către client trimisă cu succes');
  } else {
    console.error(`   ✗ Eroare la trimiterea notificării de mesaj nou către client: ${messageResult.error}`);
  }
  
  // Testăm notificarea pentru ofertă nouă către client
  console.log('\n3. Testare notificare OFERTĂ NOUĂ către CLIENT...');
  const offerResponse = await fetch('http://localhost:5000/api/test-notifications/client-new-offer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: client.id,
      offerTitle: 'Ofertă test pentru reparații',
      providerName: 'Service Auto Test',
      requestTitle: 'Cerere testare sistem'
    })
  });
  
  const offerResult = await offerResponse.json();
  if (offerResult.success) {
    console.log('   ✓ Notificare ofertă nouă către client trimisă cu succes');
  } else {
    console.error(`   ✗ Eroare la trimiterea notificării de ofertă nouă către client: ${offerResult.error}`);
  }
  
  console.log('\n=== Testare notificări CLIENT finalizată ===');
  return true;
}

async function main() {
  try {
    console.log('==================================================');
    console.log('TESTARE REPARAȚII SISTEM DE NOTIFICĂRI PRIN EMAIL');
    console.log('==================================================');
    
    // Verificăm dacă serverul rulează
    try {
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();
      console.log(`\nServer status: ${data.status}`);
      
      if (data.status !== 'ok') {
        console.error('Serverul nu pare să funcționeze corect. Vă rugăm verificați.');
        return;
      }
    } catch (error) {
      console.error('Eroare la conectarea la server. Asigurați-vă că serverul rulează pe portul 5000.');
      return;
    }
    
    // Testăm notificările pentru service providers
    const serviceSuccess = await testServiceNotifications();
    
    // Testăm notificările pentru clienți
    const clientSuccess = await testClientNotifications();
    
    console.log('\n==================================================');
    console.log('REZULTATE TESTARE:');
    console.log(`Notificări SERVICE PROVIDER: ${serviceSuccess ? '✅ SUCCES' : '❌ EȘEC'}`);
    console.log(`Notificări CLIENT: ${clientSuccess ? '✅ SUCCES' : '❌ EȘEC'}`);
    console.log('==================================================');
    
  } catch (error) {
    console.error('Eroare generală în timpul testării:', error);
  }
}

main();