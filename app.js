const express = require('express');
const crypto = require('crypto');

const app = express();

// Keep the raw body so the Meta signature can be verified
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const appSecret = process.env.APP_SECRET;           // Meta App Secret
const n8nUrl = process.env.N8N_WEBHOOK_URL;         // n8n Webhook node URL

// Meta verification handshake
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Incoming events
app.post('/', (req, res) => {
  // Verify the request really came from Meta
  const signature = req.get('x-hub-signature-256') || '';
  const expected = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody)
    .digest('hex');

  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!valid) return res.sendStatus(401);

  // Acknowledge immediately; Meta retries if you're slow
  res.sendStatus(200);

  // Forward to n8n (Node 18+ has built-in fetch)
  fetch(n8nUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  }).catch(err => console.error('Forward to n8n failed:', err.message));
});

app.listen(port, () => console.log(`Listening on port ${port}`));
