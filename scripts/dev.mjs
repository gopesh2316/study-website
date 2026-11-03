import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Start Gemini IPv4 Proxy (for local Windows IPv6 workaround)
const proxyPath = path.join(__dirname, 'gemini-proxy.mjs');
const proxyProcess = spawn(process.execPath, [proxyPath], {
  stdio: 'inherit'
});

// 2. Start Wrangler Dev
const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';
const wranglerProcess = spawn(npxCmd, ['wrangler', 'dev', '--port', '8787'], {
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  proxyProcess.kill();
  wranglerProcess.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
proxyProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Gemini proxy exited with code ${code}`);
  }
});
wranglerProcess.on('exit', (code) => {
  proxyProcess.kill();
  process.exit(code || 0);
});

