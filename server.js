const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_demonstration');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

// Serve static files (Frontend)
app.use(express.static('./'));

// Webhook endpoint needs raw body
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
    
    // Here you would use Firebase Admin SDK to securely update the application status to "accepted_and_funded"
    console.log(`[Webhook] Update Application ${appId} for Job ${jobId} to accepted_and_funded.`);
  }

  response.send();
});

// JSON middleware for other endpoints
app.use(express.json());

// Create Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { application, jobTitle, budget } = req.body;

    // Convert EGP to cents/piasters (multiply by 100)
    // Stripe requires amount in the smallest currency unit
    const unitAmount = Math.round(parseFloat(budget) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'egp',
            product_data: {
              name: `Job: ${jobTitle}`,
              description: `Payment to accept application from ${application.applicantName || 'Freelancer'}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // We pass the application ID via URL query params to the success page so the frontend can update it
      // In a production app, the backend webhook should do this securely
      success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}&app_id=${application.id}`,
      cancel_url: `${req.headers.origin}/cancel.html`,
      metadata: {
        applicationId: application.id,
        jobId: application.jobId,
        freelancerId: application.userId
      }
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`💡 Make sure to set STRIPE_SECRET_KEY in your .env file.`);
  });
}

module.exports = app;
