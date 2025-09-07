// server.js
// Run backend with: node server.js
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/generate', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.flushHeaders();

  // Fake paragraphs (simulating AI stream)
  const paras = [
    'Title: The future of remote work\n\n',
    'Remote work has transformed how companies operate. ',
    'Employees value flexibility and employers can tap global talent. ',
    '... (more paragraphs) ...'
  ];

  for (const p of paras) {
    res.write(p);                 // send piece
    await new Promise(r => setTimeout(r, 500)); // wait half a sec
  }
  res.end();
});

app.listen(3000, () => console.log('✅ Server running at http://localhost:3000'));
