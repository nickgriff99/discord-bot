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

function tryListen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.removeListener('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.removeListener('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.listen(port, onListening);
  });
}

export async function startWebServer(options = {}) {
  const preferred = options.port ?? (Number(process.env.WEB_PORT) || 4173);
  const maxAttempts = options.maxPortAttempts ?? 32;
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

  let boundPort = preferred;
  for (let i = 0; i < maxAttempts; i++) {
    const port = preferred + i;
    try {
      await tryListen(server, port);
      boundPort = port;
      break;
    } catch (err) {
      if (err.code !== 'EADDRINUSE') {
        throw err;
      }
      if (i === maxAttempts - 1) {
        throw err;
      }
    }
  }

  if (boundPort !== preferred) {
    log(`HTTP http://localhost:${boundPort} (web/) — port ${preferred} in use`);
  } else {
    log(`HTTP http://localhost:${boundPort} (web/)`);
  }

  return { server, port: boundPort };
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
