/**
 * Test diagnostic pentru EmailService
 * 
 * Acest script testează funcționalitatea de trimitere a e-mailurilor de diagnosticare
 * în cazul unei erori în sistemul de notificări
 */

import { EmailService } from './emailService.js';

// Simulare eroare cu API modificat temporar pentru a forța o eroare
async function testDiagnosticEmail() {
  console.log('=== TEST EMAIL DE DIAGNOSTICARE ===');
  
  // Verificăm configurația
  console.log('API Key:', EmailService.apiKey ? 'Configurată' : 'Lipsește');
  console.log('Email expeditor:', EmailService.fromEmail);
  
  // Salvăm URL-ul original
  const originalUrl = EmailService.baseUrl;
  
  // Modificăm temporar URL-ul API pentru a provoca eroare de conexiune
  EmailService.baseUrl = 'https://api-eroare-test.elasticemail.com/v2';
  
  console.log(`\nURL API modificat temporar la: ${EmailService.baseUrl}`);
  console.log('Acest URL invalid va provoca o eroare care va declanșa email-ul de diagnosticare');
  
  try {
    // Folosim o adresă validă dar URL invalid pentru a declanșa diagnosticarea
    const result = await EmailService.sendEmail(
      'test@example.com',
      'Test eroare - API inaccesibil',
      '<p>Acest email nu ar trebui să ajungă niciodată, deoarece API-ul este invalid.</p>',
      'Testare email diagnosticare',
      `test_error_${Date.now()}`
    );
    
    console.log('Rezultat trimitere:', result ? 'Succes' : 'Eșec');
  } catch (error) {
    console.error('Eroare capturată:', error.message);
  } finally {
    // Restabilim URL-ul original
    EmailService.baseUrl = originalUrl;
    console.log(`\nURL API resetat la: ${EmailService.baseUrl}`);
  }
  
  console.log('\nVerificați adresa notificari@carvizio.ro pentru email-ul de diagnosticare.');
  console.log('=== TEST COMPLET ===');
}

// Execută testul
testDiagnosticEmail().catch(err => {
  console.error('Eroare în execuția testului:', err);
});