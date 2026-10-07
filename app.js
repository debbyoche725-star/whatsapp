const express = require('express');

const app = express();

app.use(express.json());

const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

// GET: Verify webhook with Meta
app.get('/', (req, res) => {
  const {
    'hub.mode': mode,
    'hub.challenge': challenge,
    'hub.verify_token': token
  } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// POST: Receive WhatsApp webhook and forward it to n8n
app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));

  try {
    await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    console.log('Forwarded to n8n');
    res.status(200).end();
  } catch (error) {
    console.error('Error forwarding to n8n:', error);
    res.status(500).end();
  }
});

app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
