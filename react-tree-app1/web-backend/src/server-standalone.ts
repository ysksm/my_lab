import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

// Embedded frontend files
const FRONTEND_FILES: { [key: string]: { content: string; type: string } } = {
  '/index.html': {
    content: fs.readFileSync(path.join(__dirname, '../../web-frontend/dist/index.html'), 'utf-8'),
    type: 'text/html'
  },
  // Assets will be embedded during build
};

// Load CSS and JS files
const assetsDir = path.join(__dirname, '../../web-frontend/dist/assets');
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  files.forEach(file => {
    const filePath = path.join(assetsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const type = file.endsWith('.css') ? 'text/css' : 'application/javascript';
    FRONTEND_FILES[`/assets/${file}`] = { content, type };
  });
}

// Serve embedded files
app.get('*', (req, res) => {
  const requestPath = req.path === '/' ? '/index.html' : req.path;
  const file = FRONTEND_FILES[requestPath];
  
  if (file) {
    res.type(file.type);
    res.send(file.content);
  } else {
    // Fallback to index.html for SPA routing
    const indexFile = FRONTEND_FILES['/index.html'];
    res.type(indexFile.type);
    res.send(indexFile.content);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Serving embedded frontend files');
});