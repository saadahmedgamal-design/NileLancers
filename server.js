require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    // Fix for private key newlines in environment variables
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized successfully.');
  } catch (error) {
    console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT:', error.message);
  }
} else {
  console.log('⚠️ FIREBASE_SERVICE_ACCOUNT not set. Webhook updates will be skipped.');
}

const db = admin.apps.length ? admin.firestore() : null;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

// Serve static files (Frontend)
app.use(express.static('./'));

// Webhook endpoint for Stripe
app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log(`💰 Payment successful for session ID: ${session.id}`);
    
    const appId = session.metadata.applicationId;
    const jobId = session.metadata.jobId;
    const freelancerId = session.metadata.freelancerId;
    
    // Securely update the application status to "accepted_and_funded"
    if (db) {
      db.collection('applications').doc(appId).update({
        status: 'accepted_and_funded',
        paymentIntentId: session.payment_intent,
        fundedAt: new Date().toISOString()
      }).then(() => {
        console.log(`✅ [Webhook] Application ${appId} status updated to accepted_and_funded.`);
        
        // Also notify the freelancer
        db.collection('notifications').add({
          userId: freelancerId,
          type: 'success',
          message: `Your application for Job ${jobId} has been funded!`,
          page: 'applications',
          isRead: false,
          timestamp: new Date().toISOString()
        });
      }).catch(err => {
        console.error(`❌ [Webhook] Error updating Firestore:`, err.message);
      });
    }
  }

  response.send();
});

// JSON middleware for other endpoints
app.use(express.json());

// Create Checkout Session (Mock Mode)
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { application, jobTitle, budget } = req.body;
    
    // In mock mode, we just redirect to a local simulation page
    // We pass the data in the URL for the mock page to display
    const mockUrl = `/mock-payment.html?app_id=${application.id}&job_id=${application.jobId}&job_title=${encodeURIComponent(jobTitle)}&budget=${budget}&freelancer_id=${application.userId}`;
    
    res.json({ id: 'mock_session_' + Date.now(), url: mockUrl });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mock Payment Confirmation (Simulates Webhook)
app.post('/api/confirm-payment', async (req, res) => {
  const { appId, jobId, freelancerId } = req.body;
  
  console.log(`🛠️ [Mock Payment] Confirming payment for App ID: ${appId}`);
  
  if (db) {
    try {
      // 1. Update Application status
      await db.collection('applications').doc(appId).update({
        status: 'accepted_and_funded',
        paymentType: 'mock_stripe',
        fundedAt: new Date().toISOString()
      });

      // 2. Notify Freelancer
      await db.collection('notifications').add({
        userId: freelancerId,
        type: 'success',
        message: `Your application for Job ${jobId} has been funded!`,
        page: 'applications',
        isRead: false,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ [Mock Payment] Firestore updated and notification sent.`);
      res.json({ success: true });
    } catch (err) {
      console.error(`❌ [Mock Payment] Error updating Firestore:`, err.message);
      res.status(500).json({ error: err.message });
    }
  } else {
    console.log(`[Mock Payment] (Skipped - No DB) Update Application ${appId}`);
    res.json({ success: true, warning: 'No database connection' });
  }
});

// Email Notifications Endpoint
const nodemailer = require('nodemailer');
app.post('/api/send-email', async (req, res) => {
  const { to, subject, text } = req.body;
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ Email credentials not set. Skipping email send.');
    return res.status(200).json({ success: true, message: 'Email skipped (no credentials)' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: `"NileLancers" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    });
    console.log(`📧 Email sent to ${to}`);
    res.json({ success: true });
  } catch (error) {
    console.error('📧 Email error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('mock')) {
      console.log(`💡 Reminder: Set your real STRIPE_SECRET_KEY in the .env file to enable payments.`);
    }
  });
}

module.exports = app;
