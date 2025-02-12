import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with enhanced error handling and proper SSL
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 second timeout
  max: 20, // Maximum number of clients in the pool
  ssl: {
    rejectUnauthorized: false // Allow self-signed certificates for VPS connection
  }
});

// Test the connection and log any errors
pool.connect()
  .then(() => {
    console.log('Successfully connected to database');
  })
  .catch(err => {
    console.error('Database connection error:', err.message);
    console.error('Error details:', err);
    const sanitizedUrl = process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@') || '';
    console.error('Attempted connection to:', sanitizedUrl);
  });

export const db = drizzle(pool, { schema });