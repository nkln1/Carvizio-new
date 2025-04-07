/**
 * WebSocket Test Script
 * 
 * This script will send a test message to all connected WebSocket clients
 * to verify the real-time notification system is working correctly.
 */

import { WebSocket } from 'ws';
import http from 'http';

// Create a simple function to broadcast a test message
async function broadcastTestMessage() {
  try {
    // Connect to our WebSocket server to send a test message
    const ws = new WebSocket('ws://localhost:5000/socket');
    
    ws.on('open', function open() {
      console.log('Connected to WebSocket server');
      
      // Create a test message for notifications
      const testMessage = {
        type: 'TEST_NOTIFICATION',
        timestamp: new Date().toISOString(),
        payload: {
          title: 'Test Notification',
          content: 'This is a test notification sent at ' + new Date().toLocaleTimeString(),
          id: Date.now().toString()
        }
      };
      
      // Send the test message
      ws.send(JSON.stringify(testMessage));
      console.log('Test message sent:', testMessage);
      
      // Close the connection after sending
      setTimeout(() => {
        ws.close();
        console.log('WebSocket connection closed');
      }, 1000);
    });
    
    ws.on('message', function incoming(data) {
      console.log('Received response:', data.toString());
    });
    
    ws.on('error', function error(err) {
      console.error('WebSocket error:', err);
    });
  } catch (error) {
    console.error('Error broadcasting test message:', error);
  }
}

// Alternative approach using HTTP API to trigger a broadcast
async function triggerBroadcastViaAPI() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      type: 'TEST_NOTIFICATION',
      message: 'Test notification sent via API at ' + new Date().toLocaleTimeString()
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/test/broadcast',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('API response:', responseData);
        resolve(responseData);
      });
    });

    req.on('error', (error) => {
      console.error('Error with API request:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Run the broadcast test
async function main() {
  console.log('--- WebSocket Test Script ---');
  console.log('Sending test notification to all connected clients...');
  
  try {
    // Try broadcasting directly via WebSocket
    await broadcastTestMessage();
    
    // Wait a bit before trying the API approach
    setTimeout(async () => {
      try {
        console.log('\nTrying alternative API approach...');
        await triggerBroadcastViaAPI();
      } catch (apiError) {
        console.log('API approach failed (this is expected if the API endpoint isn\'t implemented)');
      }
      
      console.log('\nTest completed!');
    }, 2000);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Execute the test
main();