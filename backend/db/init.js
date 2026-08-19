const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function initializeDatabase() {
  const maxRetries = 10;
  let delay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔌 Attempting to connect to PostgreSQL (Attempt ${attempt}/${maxRetries})...`);
      // Try to run a simple query to verify connection
      await pool.query('SELECT 1');
      console.log('✅ Connected to PostgreSQL successfully!');
      
      // Load and execute schema
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      console.log('⚡ Initializing database schema...');
      await pool.query(schemaSql);
      console.log('🎉 Database schema initialized successfully!');
      return;
    } catch (error) {
      console.error(`❌ Connection/Initialization failed: ${error.message}`);
      if (attempt === maxRetries) {
        throw new Error('Could not connect to PostgreSQL after multiple attempts. Exiting.');
      }
      console.log(`⏱️ Waiting ${delay}ms before next retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // Exponential backoff
      delay = Math.min(delay * 1.5, 10000);
    }
  }
}

module.exports = { initializeDatabase };
