require('dotenv').config(); // ← MUST be first before any process.env usage

const express  = require('express');
const cors     = require('cors');
const nodemailer = require('nodemailer');

// Stripe is initialised AFTER dotenv so the real key is loaded
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.static('./'));   // Serve frontend files

// ─── Stripe Webhook (needs raw body — must be before express.json) ────────────
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  // If no webhook secret configured, skip verification (fine for local testing)
  if (!process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_mock')) {
    console.log('⚠️  Webhook secret not set — skipping (success.html handles DB update as fallback).');
    return res.sendStatus(200);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('⚠️  Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const appId   = session.metadata?.applicationId;
    const jobId   = session.metadata?.jobId;
    console.log(`💰 Payment SUCCESS — session: ${session.id} | app: ${appId} | job: ${jobId}`);
    // Note: status update is handled by success.html on the client side.
    // For production, add Firebase Admin SDK here to update from the backend.
  }

  res.sendStatus(200);
});

// ─── JSON middleware (after webhook raw) ──────────────────────────────────────
app.use(express.json());

// ─── Create Stripe Checkout Session ──────────────────────────────────────────
app.post('/create-checkout-session', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('mock')) {
    return res.status(500).json({
      error: '⛔ STRIPE_SECRET_KEY is not set. Please add your real sk_test_... key to the .env file.'
    });
  }

  try {
    const { application, jobTitle, budget } = req.body;

    // Guard: Stripe requires a minimum amount (50 piasters = 0.50 EGP)
    const rawAmount  = parseFloat(budget) || 500;   // Default 500 EGP if missing
    const unitAmount = Math.max(Math.round(rawAmount * 100), 50); // min 50 piasters

    const origin  = req.headers.origin || `http://localhost:${PORT}`;
    const appId   = application?.id || 'unknown';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'egp',
            product_data: {
              name: `NileLancers — ${jobTitle || 'Freelance Service'}`,
              description: `Hiring ${application?.applicantName || 'Freelancer'} for this project`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}&app_id=${appId}`,
      cancel_url:  `${origin}/index.html`,   // go back to app on cancel (no cancel.html needed)
      metadata: {
        applicationId: appId,
        jobId:         application?.jobId        || '',
        freelancerId:  application?.userId       || '',
        amountEGP:     String(rawAmount),
      },
    });

    console.log(`🛒 Checkout session created: ${session.id} — EGP ${rawAmount} — app: ${appId}`);
    res.json({ id: session.id, url: session.url });

  } catch (error) {
    console.error('❌ Stripe Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Email Notifications ──────────────────────────────────────────────────────
app.post('/api/send-email', async (req, res) => {
  const { to, subject, text } = req.body;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ Email credentials not set — skipping.');
    return res.status(200).json({ success: true, message: 'Email skipped (no credentials)' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  try {
    await transporter.sendMail({
      from: `"NileLancers" <${process.env.EMAIL_USER}>`,
      to, subject, text,
    });
    console.log(`📧 Email sent to ${to}`);
    res.json({ success: true });
  } catch (error) {
    console.error('📧 Email error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    const keyStatus = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') && !process.env.STRIPE_SECRET_KEY.includes('mock')
      ? '✅ Real test key loaded!'
      : '⚠️  Mock key detected — add your sk_test_... key to .env';
    console.log(`🚀 Server running → http://localhost:${PORT}`);
    console.log(`💳 Stripe key: ${keyStatus}`);
  });
}

module.exports = app;
