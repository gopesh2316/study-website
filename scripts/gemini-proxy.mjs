import http from 'http';

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const targetUrl = 'https://generativelanguage.googleapis.com' + req.url;

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const bodyBuffer = Buffer.concat(chunks);

    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: bodyBuffer.length > 0 ? bodyBuffer : undefined
    });

    const respHeaders = {};
    upstreamRes.headers.forEach((val, key) => {
      if (key !== 'transfer-encoding' && key !== 'content-encoding') {
        respHeaders[key] = val;
      }
    });

    res.writeHead(upstreamRes.status, respHeaders);
    const data = await upstreamRes.arrayBuffer();
    res.end(Buffer.from(data));
  } catch (err) {
    console.error('[Gemini Proxy Error]', err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy fetch failed: ' + err.message }));
  }
});

server.listen(8789, '127.0.0.1', () => {
  console.log('[Gemini IPv4 Proxy] Listening on http://127.0.0.1:8789');
});

