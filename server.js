#!/usr/bin/env node
/**
 * server.js — Local static server for the Oceanário de Lisboa ticketing app.
 *
 * Usage:
 *   node server.js          # serves on http://localhost:3000
 *   PORT=8080 node server.js
 *
 * API calls to services.clorian.com are handled in the browser by sw-mock.js
 * (a service worker registered automatically on first page load).
 *
 * Note: Service workers require a secure origin (HTTPS) or localhost.
 * This server uses http://localhost which satisfies that requirement.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT    = process.env.PORT || 3000;
const ROOT    = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.ttf':  'font/ttf',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.txt':  'text/plain',
  '.webmanifest': 'application/manifest+json',
};

function serveFile(res, filePath) {
  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  // Strip query string
  let urlPath = req.url.split('?')[0].split('#')[0];

  // Decode URI
  try { urlPath = decodeURIComponent(urlPath); } catch (_) {}

  // Map "/" → "/index.html"
  if (urlPath === '/') urlPath = '/index.html';

  const candidate = path.join(ROOT, urlPath);

  // Security: prevent directory traversal
  if (!candidate.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(candidate, (err, stat) => {
    if (!err && stat.isFile()) {
      serveFile(res, candidate);
      return;
    }

    // SPA fallback: serve the closest index.html
    // e.g. /en/some-route → /en/index.html
    const dir  = path.dirname(candidate);
    const idx1 = path.join(dir, 'index.html');
    fs.stat(idx1, (e2, s2) => {
      if (!e2 && s2.isFile()) {
        serveFile(res, idx1);
        return;
      }
      // Root fallback
      serveFile(res, path.join(ROOT, 'index.html'));
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Oceanário de Lisboa — local server`);
  console.log(`  ➜  http://localhost:${PORT}\n`);
  console.log('  API calls are intercepted by sw-mock.js (service worker).');
  console.log('  Open the URL above, then reload once after the SW installs.\n');
});
