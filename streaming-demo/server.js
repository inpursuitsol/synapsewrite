// Export to WordPress route
// Needs: npm install express node-fetch
const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const WP_SITE = "https://example.com"; // your WordPress site
const WP_USER = "yourusername";        // WordPress username
const WP_APP_PASS = "abcd efgh ijkl";  // WordPress app password

app.post('/exportToWP', async (req, res) => {
  const { title, content } = req.body;
  try {
    const response = await fetch(`${WP_SITE}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        "Authorization": "Basic " + Buffer.from(WP_USER + ":" + WP_APP_PASS).toString("base64"),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        content,       // must be HTML, not raw Markdown
        status: "draft"
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    res.json({ success: true, postUrl: `${WP_SITE}/?p=${data.id}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(4000, () => console.log("✅ Export-to-WP API running on http://localhost:4000"));
