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
const LOCAL_MOCK_TAG = '<script src="/local-api-mock.js"></script>';

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
    if (ext === '.html') {
      let html = data.toString('utf8');
      if (!html.includes(LOCAL_MOCK_TAG)) {
        html = html.replace('</head>', `    ${LOCAL_MOCK_TAG}\n  </head>`);
      }
      res.writeHead(200, { 'Content-Type': mime });
      res.end(html);
      return;
    }

    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

const RESOLVED_ROOT = path.resolve(ROOT);
const ROOT_INDEX    = path.join(RESOLVED_ROOT, 'index.html');

/**
 * Sanitize a URL path into safe file-system segments.
 * Removes empty segments, `.`, and `..` so the result can never escape ROOT.
 */
function sanitizeSegments(urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch (_) { decoded = '/'; }
  return decoded.split('/').filter(s => s && s !== '.' && s !== '..');
}

const server = http.createServer((req, res) => {
  // Strip query string / fragment
  const rawPath = req.url.split('?')[0].split('#')[0];

  // Build a safe path from sanitized segments
  const segments = sanitizeSegments(rawPath);
  const candidate = segments.length > 0
    ? path.join(RESOLVED_ROOT, ...segments)
    : RESOLVED_ROOT;

  fs.stat(candidate, (err, stat) => {
    if (!err && stat.isFile()) {
      serveFile(res, candidate);
      return;
    }

    // SPA fallback: serve the closest index.html
    // e.g. /en/some-route → /en/index.html
    const parentSegments = segments.slice(0, -1);
    const idx1 = parentSegments.length > 0
      ? path.join(RESOLVED_ROOT, ...parentSegments, 'index.html')
      : ROOT_INDEX;

    fs.stat(idx1, (e2, s2) => {
      if (!e2 && s2.isFile()) {
        serveFile(res, idx1);
        return;
      }
      // Root fallback
      serveFile(res, ROOT_INDEX);
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Oceanário de Lisboa — local server`);
  console.log(`  ➜  http://localhost:${PORT}\n`);
  console.log('  API calls are intercepted by sw-mock.js (service worker).');
  console.log('  Open the URL above, then reload once after the SW installs.\n');
});
