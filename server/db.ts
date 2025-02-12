import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = false; // Allow non-secure WebSocket for development
neonConfig.pipelineTLS = false; // Disable TLS pipeline for development
neonConfig.pipelineConnect = false; // Disable pipeline connect for development

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with enhanced error handling
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 second timeout
  max: 20, // Maximum number of clients in the pool
  ssl: {
    rejectUnauthorized: false
  }
});

// Test the connection and log any errors
pool.connect()
  .then(() => {
    console.log('Successfully connected to database');
  })
  .catch(err => {
    console.error('Database connection error:', err.message);
    // Add more detailed error information for debugging
    console.error('Error details:', err);
    // Log connection string (without sensitive data) for debugging
    const sanitizedUrl = process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@') || '';
    console.error('Attempted connection to:', sanitizedUrl);
  });

export const db = drizzle(pool, { schema });