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
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  ssl: false // Disable SSL for VPS connection
});

// Test database connection and keep retrying
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database');
    await client.query('SELECT NOW()'); // Test the connection with a simple query
    console.log('Database query successful');
    client.release();
  } catch (err: any) {
    console.error('Database connection error:', err.message);
    // Retry connection after 5 seconds
    setTimeout(testConnection, 5000);
  }
};

testConnection();

export const db = drizzle(pool, { schema });