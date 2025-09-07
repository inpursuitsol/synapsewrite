// server.js
// Simple Express backend: /exportToWP accepts { title, content } and creates a WP draft.
// Usage: set WP_SITE, WP_USER, WP_APP_PASS in .env then `node server.js`

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // npm i node-fetch@2
require('dotenv').config(); // npm i dotenv

const app = express();
app.use(cors()); // allow requests from your frontend (localhost)
app.use(express.json({ limit: '2mb' }));

// Read settings from environment
const WP_SITE = process.env.WP_SITE;         // e.g. https://example.com
const WP_USER = process.env.WP_USER;         // WP username
const WP_APP_PASS = process.env.WP_APP_PASS; // application password (space separated)
const PORT = process.env.PORT || 3000;

if (!WP_SITE || !WP_USER || !WP_APP_PASS) {
  console.warn('Warning: WP_SITE, WP_USER or WP_APP_PASS missing in environment. /exportToWP will fail until set.');
}

app.post('/exportToWP', async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ success: false, error: 'Missing title or content' });

  try {
    const url = `${WP_SITE.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
    const auth = 'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASS}`).toString('base64');

    const wpRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        content,      // HTML expected; WP will store this in post_content
        status: 'draft'
      })
    });

    const data = await wpRes.json();
    if (!wpRes.ok) {
      // include WP response for debugging (trim long messages)
      return res.status(500).json({ success: false, error: 'WP API error', details: data });
    }

    // Return a friendly edit URL for the created draft
    const editUrl = `${WP_SITE.replace(/\/$/, '')}/wp-admin/post.php?post=${data.id}&action=edit`;
    return res.json({ success: true, postId: data.id, editUrl });
  } catch (err) {
    console.error('Export error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Export API listening on http://localhost:${PORT}`);
});
