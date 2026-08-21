const { Pool } = require('pg');

const useSSL = process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes('localhost') &&
  !process.env.DATABASE_URL.includes('127.0.0.1') &&
  !process.env.DATABASE_URL.includes('postgres:');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // max pool size per replica
  idleTimeoutMillis: 30000,   // close idle connections after 30s
  connectionTimeoutMillis: 5000,
  ssl: useSSL ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

// Utility: run query with automatic retry on transient errors
async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

module.exports = { pool, query };
