import fs from 'fs';
import path from 'path';

const frontendDistPath = path.join(__dirname, '../../web-frontend/dist');
const indexPath = path.join(frontendDistPath, 'index.html');

console.log('Checking frontend build...');
console.log(`Frontend dist path: ${frontendDistPath}`);

if (!fs.existsSync(frontendDistPath)) {
  console.error('❌ Frontend dist directory does not exist!');
  console.error('Please run "npm run build" in the web-frontend directory first.');
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  console.error('❌ index.html not found in frontend dist directory!');
  console.error('Please ensure the frontend build completed successfully.');
  process.exit(1);
}

const files = fs.readdirSync(frontendDistPath);
console.log('\n✅ Frontend build found!');
console.log('Files in dist directory:');
files.forEach(file => {
  const stats = fs.statSync(path.join(frontendDistPath, file));
  if (stats.isDirectory()) {
    console.log(`  📁 ${file}/`);
  } else {
    console.log(`  📄 ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
  }
});

console.log('\n✅ Build check completed successfully!');
console.log('The Express server can serve these files properly.');