const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3300;

// Serve static files with correct MIME types
app.use(express.static(__dirname, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.js'))  res.setHeader('Content-Type', 'application/javascript');
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', project: 'BlockScholar', port: PORT });
});

// Fallback: serve index.html for any unknown route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   BlockScholar dApp — Local Server   ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Running at: http://localhost:${PORT}    ║`);
  console.log('║  Health:     http://localhost:' + PORT + '/health ║');
  console.log('╚══════════════════════════════════════╝');
});