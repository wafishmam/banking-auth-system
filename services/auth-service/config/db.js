// config/db.js

// Import the PostgreSQL library
const { Pool } = require('pg');

// What is Pool?
// Pool manages multiple database connections efficiently
// Instead of opening/closing connections constantly, it reuses them
// Think of it like a carpool - more efficient than everyone driving separately

// Create a new connection pool using the DATABASE_URL from .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL configuration (required for production databases like Heroku/Railway)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// What is process.env?
// It's an object that contains all environment variables from .env file
// dotenv library loads these values so we can access them here

// Test the database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Handle connection errors
pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1); // Exit the application if database connection fails
});

// Export the pool so other files can use it
module.exports = pool;