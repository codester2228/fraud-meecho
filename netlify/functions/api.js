// netlify/functions/api.js

const express = require('express');
const { Pool } = require('pg'); // Import pg for PostgreSQL
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
const router = express.Router();

// Middleware
app.use(cors());
app.use(express.json());

// --- Neon DB Connection ---
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- API Endpoint ---
router.post('/submit-referral', async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP are required.' });
  }

  try {
    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(15) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert data
    const result = await pool.query(
      'INSERT INTO referrals (phone, otp) VALUES ($1, $2) RETURNING *',
      [phone, otp]
    );
    
    console.log('Data inserted successfully into Neon DB:', result.rows[0]);
    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (err) {
    console.error('Error executing query with Neon DB', err.stack);
    res.status(500).json({ error: 'Failed to save data to the database.' });
  } finally {
    // Don't close the pool here as it's shared across requests
  }
});

// Mount the router on a specific path for serverless execution
app.use('/api/', router);

// Export the handler for Netlify
module.exports.handler = serverless(app);