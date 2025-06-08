// netlify/functions/api.js

const express = require('express');
const { NetlifyDB } = require('@netlify/sdk'); // Import Netlify DB
const cors = require('cors');
const serverless = require('serverless-http'); // Import serverless-http

const app = express();
const router = express.Router();

// Middleware
app.use(cors());
app.use(express.json());

// --- Netlify DB Connection ---
const netlifyDb = new NetlifyDB();

// --- API Endpoint ---
router.post('/submit-referral', async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP are required.' });
  }

  try {
    const referralData = {
        phone: phone,
        otp: otp,
        createdAt: new Date().toISOString(),
    };

    const result = await netlifyDb.create({
        key: `referrals`, // The collection name
        value: referralData,
    });
    
    console.log('Data inserted successfully into Netlify DB:', result);
    res.status(201).json({ success: true, data: result });

  } catch (err) {
    console.error('Error executing query with Netlify DB', err.stack);
    res.status(500).json({ error: 'Failed to save data to the database.' });
  }
});

// Mount the router on a specific path for serverless execution
app.use('/api/', router);

// Export the handler for Netlify
module.exports.handler = serverless(app);
