const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// SEA用にフロントエンドファイルを埋め込む
const FRONTEND_FILES = {};

// ビルド時にフロントエンドファイルを読み込む
function loadFrontendFiles() {
  const distPath = path.join(__dirname, '../../web-frontend/dist');
  
  // index.htmlを読み込む
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    FRONTEND_FILES['/index.html'] = {
      content: fs.readFileSync(indexPath, 'utf-8'),
      type: 'text/html'
    };
  }
  
  // assetsディレクトリのファイルを読み込む
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const files = fs.readdirSync(assetsPath);
    files.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const type = file.endsWith('.css') ? 'text/css' : 'application/javascript';
      FRONTEND_FILES[`/assets/${file}`] = { content, type };
    });
  }
}

// フロントエンドファイルを読み込む
loadFrontendFiles();

// 埋め込まれたファイルを提供
app.get('*', (req, res) => {
  const requestPath = req.path === '/' ? '/index.html' : req.path;
  const file = FRONTEND_FILES[requestPath];
  
  if (file) {
    res.type(file.type);
    res.send(file.content);
  } else {
    // SPAルーティング用のフォールバック
    const indexFile = FRONTEND_FILES['/index.html'];
    if (indexFile) {
      res.type(indexFile.type);
      res.send(indexFile.content);
    } else {
      res.status(404).send('Not Found');
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Serving ${Object.keys(FRONTEND_FILES).length} embedded files`);
});