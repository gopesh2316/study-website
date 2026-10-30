import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');

// Ensure public directories exist
fs.mkdirSync(path.join(publicDir, 'css'), { recursive: true });
fs.mkdirSync(path.join(publicDir, 'js'), { recursive: true });

function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const item of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Ensure js/config.js exists in rootDir (fallback to config.example.js if gitignored/missing)
const rootConfig = path.join(rootDir, 'js', 'config.js');
const rootConfigExample = path.join(rootDir, 'js', 'config.example.js');
if (!fs.existsSync(rootConfig) && fs.existsSync(rootConfigExample)) {
  fs.copyFileSync(rootConfigExample, rootConfig);
}

// Copy top-level static assets
copyFile(path.join(rootDir, 'index.html'), path.join(publicDir, 'index.html'));
copyFile(path.join(rootDir, 'hand_3d.png'), path.join(publicDir, 'hand_3d.png'));

// Copy CSS and JS bundles
copyDir(path.join(rootDir, 'css'), path.join(publicDir, 'css'));
copyDir(path.join(rootDir, 'js'), path.join(publicDir, 'js'));

// Guarantee public/js/config.js exists even if config.js was not in js/
const pubConfig = path.join(publicDir, 'js', 'config.js');
if (!fs.existsSync(pubConfig) && fs.existsSync(rootConfigExample)) {
  fs.copyFileSync(rootConfigExample, pubConfig);
}

console.log('✓ Successfully synchronized website static assets to public/');
