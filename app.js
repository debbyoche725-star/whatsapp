```js
// Import Express.js
const express = require('express');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Environment variables
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

// --------------------------------------------------
// Health check
// --------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).send('Webhook server is running');
});

// --------------------------------------------------
// GET /
// Meta uses this route to verify your WhatsApp webhook
// --------------------------------------------------
app.get('/', (req, res) => {
  const {
    'hub.mode': mode,
    'hub.challenge': challenge,
    'hub.verify_token': token
  } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    return res.status(200).send(challenge);
  }

  console.log('WEBHOOK VERIFICATION FAILED');
  return res.status(403).end();
});

// --------------------------------------------------
// POST /
// Meta sends WhatsApp messages/events here
// We forward them to n8n
// --------------------------------------------------
app.post('/', async (req, res) => {
  const timestamp = new Date()
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  console.log(`\nWebhook received ${timestamp}`);
  console.log(JSON.stringify(req.body, null, 2));

  // Check that the n8n URL exists
  if (!n8nWebhookUrl) {
    console.error('N8N_WEBHOOK_URL is not configured');
    return res.status(500).end();
  }

  try {
    // Forward the WhatsApp webhook to n8n
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    console.log(`n8n response status: ${n8nResponse.status}`);

    if (!n8nResponse.ok) {
      const responseText = await n8nResponse.text();

      console.error('n8n returned an error:');
      console.error(responseText);

      // Acknowledge the Meta webhook
      return res.status(200).end();
    }

    console.log('Successfully forwarded webhook to n8n');

    // Tell Meta the webhook was received
    return res.status(200).end();

  } catch (error) {
    console.error('Error forwarding webhook to n8n:');
    console.error(error);

    // Acknowledge Meta after receiving the event
    return res.status(200).end();
  }
});

// --------------------------------------------------
// Start the server
// --------------------------------------------------
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
  console.log('Webhook server is running');
});
```
