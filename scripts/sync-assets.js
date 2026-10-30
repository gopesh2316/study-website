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

// Copy top-level static assets
copyFile(path.join(rootDir, 'index.html'), path.join(publicDir, 'index.html'));
copyFile(path.join(rootDir, 'hand_3d.png'), path.join(publicDir, 'hand_3d.png'));

// Copy CSS and JS bundles
copyDir(path.join(rootDir, 'css'), path.join(publicDir, 'css'));
copyDir(path.join(rootDir, 'js'), path.join(publicDir, 'js'));

console.log('✓ Successfully synchronized website static assets to public/');

