import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a new pool with the DATABASE_URL and improved connection settings
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Reduced from 20 to prevent overwhelming the VPS
  idleTimeoutMillis: 60000, // Increased from 30000 to allow longer idle times
  connectionTimeoutMillis: 10000, // Increased from 5000 to allow more time for connection
  ssl: false // Disable SSL for VPS connection
});

// Test database connection and keep retrying
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database');
    client.release();
  } catch (err: any) {
    console.error('Database connection error:', err.message);
    // Retry connection after 5 seconds
    setTimeout(testConnection, 5000);
  }
};

testConnection();

export const db = drizzle(pool, { schema });