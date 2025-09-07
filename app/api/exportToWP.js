// api/exportToWP.js
// Vercel Serverless Function (Node 18). Receives { title, content } and creates a WP draft.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { title, content } = req.body || {};
    if (!title || !content) return res.status(400).json({ success: false, error: 'Missing title or content' });

    const WP_SITE = process.env.WP_SITE;
    const WP_USER = process.env.WP_USER;
    const WP_APP_PASS = process.env.WP_APP_PASS;

    if (!WP_SITE || !WP_USER || !WP_APP_PASS) {
      return res.status(500).json({ success: false, error: 'Server not configured: missing WP_SITE / WP_USER / WP_APP_PASS' });
    }

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
        content,   // expects HTML (not raw Markdown)
        status: 'draft'
      })
    });

    const data = await wpRes.json();
    if (!wpRes.ok) {
      return res.status(500).json({ success: false, error: 'WP API error', details: data });
    }

    const editUrl = `${WP_SITE.replace(/\/$/, '')}/wp-admin/post.php?post=${data.id}&action=edit`;
    return res.status(200).json({ success: true, postId: data.id, editUrl });
  } catch (err) {
    console.error('exportToWP error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
