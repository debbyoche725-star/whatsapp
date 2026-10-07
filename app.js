```javascript
const express = require('express');

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// --------------------------------------------------
// WhatsApp / Meta webhook verification
// --------------------------------------------------

app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('Webhook verification request received');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK VERIFIED');
    return res.status(200).send(challenge);
  }

  console.log('WEBHOOK VERIFICATION FAILED');
  return res.sendStatus(403);
});

// --------------------------------------------------
// WhatsApp webhook
// --------------------------------------------------

app.post('/', async (req, res) => {
  console.log('\n========== WHATSAPP WEBHOOK ==========');
  console.log(JSON.stringify(req.body, null, 2));

  // Acknowledge Meta immediately.
  // WhatsApp expects a successful response quickly.
  res.sendStatus(200);

  // Check n8n configuration
  if (!N8N_WEBHOOK_URL) {
    console.error('ERROR: N8N_WEBHOOK_URL is not configured.');
    return;
  }

  try {
    console.log('Forwarding webhook to n8n...');

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const responseText = await response.text();

    console.log(`n8n status: ${response.status}`);
    console.log(`n8n response: ${responseText}`);

    if (!response.ok) {
      console.error('n8n returned an error.');
    } else {
      console.log('Successfully forwarded webhook to n8n.');
    }

  } catch (error) {
    console.error('Could not connect to n8n:');
    console.error(error);
  }
});

// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
```
