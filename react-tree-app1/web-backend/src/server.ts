import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

const frontendDistPath = path.join(__dirname, '../../web-frontend/dist');

app.use(express.static(frontendDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});