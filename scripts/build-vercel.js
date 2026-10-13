const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('[build-vercel] 1. Installing server dependencies...');
execSync('npm install --production=false', { cwd: path.join(ROOT, 'server'), stdio: 'inherit' });

console.log('[build-vercel] 2. Building dashboard...');
execSync('npm install && npm run build', { cwd: path.join(ROOT, 'dashboard'), stdio: 'inherit' });

console.log('[build-vercel] 3. Preparing public assets directory...');
if (fs.existsSync(PUBLIC)) {
  fs.rmSync(PUBLIC, { recursive: true, force: true });
}
fs.mkdirSync(PUBLIC, { recursive: true });

// Copy demo storefront files to public root
console.log('[build-vercel] Copying demo storefront files to public/...');
copyDir(path.join(ROOT, 'demo'), PUBLIC);

// Copy tracker.js to public root
console.log('[build-vercel] Copying tracker.js to public/...');
fs.copyFileSync(path.join(ROOT, 'tracker', 'tracker.js'), path.join(PUBLIC, 'tracker.js'));

// Copy built dashboard dist to public/dashboard
console.log('[build-vercel] Copying dashboard/dist to public/dashboard/...');
copyDir(path.join(ROOT, 'dashboard', 'dist'), path.join(PUBLIC, 'dashboard'));

console.log('[build-vercel] Build completed successfully! Public assets ready for Vercel.');
