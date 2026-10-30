# EcoMatrix - Interactive Economics & Graph Simulator

An interactive web simulator for microeconomics and macroeconomics with live dynamic graphs for production, cost curves, revenue, market equilibrium, taxes, and Keynesian multiplier.

Configured and optimized for **Cloudflare Workers** with Static Assets, Edge API routes, and enterprise security headers.

---

## ⚡ Cloudflare Workers Setup

This project uses modern **Cloudflare Workers Static Assets** (`env.ASSETS`) combined with a Worker edge handler (`src/index.js`) for full edge programmability.

### Project Structure

```text
├── src/
│   └── index.js             # Cloudflare Worker edge handler (APIs, security headers, fallback)
├── public/                  # Static assets served by Cloudflare Workers (env.ASSETS)
│   ├── css/
│   ├── js/
│   ├── hand_3d.png
│   └── index.html
├── scripts/
│   └── sync-assets.js       # Automatically synchronizes root assets to public/
├── wrangler.jsonc           # Primary Cloudflare Workers configuration (with JSON schema)
├── wrangler.toml            # TOML fallback configuration
├── package.json             # NPM scripts for dev and deploy
└── index.html, css/, js/    # Workspace source files
```

---

## 🚀 Quick Start

### 1. Run Locally with Cloudflare Workers Dev Server
Run the local Cloudflare Workers simulator with instant reload:

```bash
npm run dev
# or
npx wrangler dev
```
The Worker will start on **`http://localhost:8787`** with full Cloudflare Workers runtime emulation (`request.cf`, edge caching, and security headers).

### 2. Deploy to Cloudflare Workers (Worldwide Edge)
Deploy your site live to Cloudflare's global edge network in seconds:

```bash
npm run deploy
# or
npx wrangler deploy
```

> **Note**: If you are deploying for the first time, Wrangler will open your browser to log in to your free Cloudflare account.

---

## 🛠 Available Edge Endpoints

- **`GET /`** - Main EcoMatrix interactive application
- **`GET /api/health`** - Worker health status and edge location metadata (e.g. data center colo, country, city)
- **`GET /api/info`** - Application metadata and active runtime features
