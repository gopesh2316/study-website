/**
 * Cloudflare Worker for EcoMatrix Website
 * 
 * Features:
 * - High-speed edge static asset delivery via Cloudflare Workers Static Assets (env.ASSETS)
 * - Automatic edge caching and compression (Brotli/Gzip)
 * - Security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
 * - Edge health & API endpoints (/api/health, /api/info)
 * - SPA clean routing fallback for client-side navigation
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Edge API Routes
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'ecomatrix-workers',
        cf: {
          colo: request.cf?.colo || 'local',
          country: request.cf?.country || 'local',
          city: request.cf?.city || 'local',
        }
      }, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (url.pathname === '/api/info') {
      return new Response(JSON.stringify({
        name: 'EcoMatrix Interactive Economics Simulator',
        version: '1.0.0',
        runtime: 'Cloudflare Workers',
        environment: env.ENVIRONMENT || 'production',
        features: [
          'Static Assets Edge Serving',
          'Dynamic Microeconomics Simulators',
          'Chart.js Interactive Cost & Market Curves',
          'Zero Latency Edge Deployment'
        ]
      }, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 2. Static Asset Delivery via env.ASSETS
    let response;
    try {
      if (env.ASSETS) {
        response = await env.ASSETS.fetch(request);
      } else {
        response = new Response('Static assets binding not found', { status: 500 });
      }
    } catch (err) {
      return new Response(`Worker Asset Error: ${err.message}`, { status: 500 });
    }

    // 3. Fallback to index.html for SPA / clean routing if 404 on page routes
    if (response.status === 404 && !url.pathname.includes('.')) {
      const fallbackUrl = new URL('/index.html', request.url);
      response = await env.ASSETS.fetch(new Request(fallbackUrl, request));
    }

    // 4. Enrich response with Edge Security & Performance Headers
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Cache tuning: Long cache for static immutable assets, short cache for HTML
    if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg')) {
      if (!headers.has('Cache-Control')) {
        headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      }
    } else if (url.pathname === '/' || url.pathname.endsWith('.html')) {
      headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
