/**
 * Script de testare pentru API Elastic Email
 */

import fetch from 'node-fetch';

const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
const fromEmail = 'notificari@carvizio.ro';
const fromName = 'Auto Service App Diagnostic';
const baseUrl = 'https://api.elasticemail.com/v2';

async function testApiConnection() {
  try {
    console.log('Testing Elastic Email API connection...');
    console.log('API Key present:', !!apiKey);
    console.log('API Key hint:', apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'not set');
    
    // Testăm o cerere GET simplă pentru a verifica conexiunea
    const accountUrl = `${baseUrl}/account/load?apikey=${apiKey}`;
    console.log('Sending request to:', accountUrl);
    
    const response = await fetch(accountUrl);
    
    console.log('Response status:', response.status);
    console.log('Response content type:', response.headers.get('content-type'));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Account info:', JSON.stringify(data, null, 2));
      return true;
    } else {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return false;
    }
  } catch (error) {
    console.error('Error testing API connection:', error);
    return false;
  }
}

async function testSendEmail() {
  try {
    console.log('\nTesting sending an email...');
    
    // Construim URL-ul cu parametrii pentru a folosi application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('apikey', apiKey || '');
    params.append('to', 'test@example.com');
    params.append('from', fromEmail);
    params.append('fromName', fromName);
    params.append('subject', 'Test Email API Diagnostic');
    params.append('bodyHtml', '<h1>Test Email</h1><p>Acesta este un test de diagnosticare pentru API-ul Elastic Email.</p>');
    params.append('bodyText', 'Test Email. Acesta este un test de diagnosticare pentru API-ul Elastic Email.');

    console.log('Sending request to:', `${baseUrl}/email/send`);
    console.log('Request parameters:', params.toString());
    
    const response = await fetch(`${baseUrl}/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-ElasticEmail-ApiKey': apiKey || ''
      },
      body: params
    });
    
    console.log('Response status:', response.status);
    console.log('Response content type:', response.headers.get('content-type'));
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      console.log('Email send result:', typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      return true;
    } else {
      const errorText = await response.text();
      console.error('Error sending email:', errorText);
      return false;
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return false;
  }
}

async function main() {
  console.log('=== Elastic Email API Diagnostic Tool ===');
  
  const connectionResult = await testApiConnection();
  console.log('\nAPI Connection Test:', connectionResult ? 'SUCCESS' : 'FAILED');
  
  const emailResult = await testSendEmail();
  console.log('\nEmail Send Test:', emailResult ? 'SUCCESS' : 'FAILED');
  
  console.log('\n=== Diagnostic Complete ===');
}

main().catch(console.error);