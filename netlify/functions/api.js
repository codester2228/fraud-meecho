const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
const router = express.Router();

// Middleware
app.use(cors());
app.use(express.json());

// --- Debugging: Log all environment variables ---
console.log('=== ENVIRONMENT VARIABLES ===');
console.log('NETLIFY_DATABASE_URL:', process.env.NETLIFY_DATABASE_URL);
console.log('NETLIFY_DATABASE_URL_UNPOOLED:', process.env.NETLIFY_DATABASE_URL_UNPOOLED);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('=======================');

// --- Neon DB Connection ---
const poolConfig = {
  connectionString: process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED,
  ssl: {
    rejectUnauthorized: false
  }
};

console.log('Database Connection Config:', poolConfig);

const pool = new Pool(poolConfig);

// Test database connection immediately
pool.query('SELECT NOW()')
  .then(res => {
    console.log('✅ Database connection successful. Current time:', res.rows[0].now);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    console.error('Connection string used:', poolConfig.connectionString);
    console.error('Error details:', {
      code: err.code,
      message: err.message,
      stack: err.stack
    });
  });

// --- API Endpoint ---
router.post('/submit-referral', async (req, res) => {
  console.log('📥 Received submission request:', {
    headers: req.headers,
    body: req.body,
    ip: req.ip
  });

  const { phone, otp } = req.body;

  if (!phone || !otp) {
    console.log('❌ Validation failed - missing phone or OTP');
    return res.status(400).json({ error: 'Phone number and OTP are required.' });
  }

  try {
    console.log('🛠 Creating referrals table if not exists...');
    const createTableResult = await pool.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(15) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table creation result:', createTableResult);

    console.log('💾 Inserting referral data:', { phone, otp });
    const result = await pool.query(
      'INSERT INTO referrals (phone, otp) VALUES ($1, $2) RETURNING *',
      [phone, otp]
    );
    
    console.log('🎉 Data inserted successfully:', result.rows[0]);
    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (err) {
    console.error('🔥 Database error:', {
      message: err.message,
      stack: err.stack,
      query: err.query,
      parameters: err.parameters
    });
    res.status(500).json({ 
      error: 'Failed to save data to the database.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.use('/api/', router);

module.exports.handler = serverless(app);