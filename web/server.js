import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = normalize(process.cwd());
const WEB_DIR = normalize(join(ROOT, 'web'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function pathnameFromUrl(urlPath) {
  if (!urlPath || urlPath === '/') {
    return '/index.html';
  }
  try {
    const pathname = new URL(urlPath, 'http://localhost').pathname;
    return pathname === '/' ? '/index.html' : pathname;
  } catch {
    const withoutQuery = urlPath.split('?')[0] || '/';
    return withoutQuery === '/' ? '/index.html' : withoutQuery;
  }
}

function safePath(urlPath) {
  const requested = pathnameFromUrl(urlPath);
  const cleanPath = normalize(join(WEB_DIR, requested));
  return cleanPath.startsWith(WEB_DIR) ? cleanPath : null;
}

export function startWebServer(options = {}) {
  const port = options.port ?? (Number(process.env.WEB_PORT) || 4173);
  const log = options.logger ?? ((msg) => console.log(msg));

  const server = createServer((req, res) => {
    const filePath = safePath(req.url || '/');

    if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const type = MIME[extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      server.removeListener('error', reject);
      log(`HTTP http://localhost:${port} (web/)`);
      resolve({ server, port });
    });
  });
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return fileURLToPath(import.meta.url) === fileURLToPath(pathToFileURL(entry));
}

if (isDirectRun()) {
  startWebServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
