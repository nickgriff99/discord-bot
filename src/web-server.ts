import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = normalize(process.cwd());
const WEB_DIST = normalize(join(ROOT, 'web', 'dist'));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
};

function pathnameOnly(urlPath: string): string {
  if (!urlPath || urlPath === '/') {
    return '/';
  }
  try {
    return new URL(urlPath, 'http://localhost').pathname;
  } catch {
    const withoutQuery = urlPath.split('?')[0] || '/';
    return withoutQuery;
  }
}

function safeResolvedPath(webDir: string, pathname: string): string | null {
  const relative = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  const cleanPath = normalize(join(webDir, relative));
  return cleanPath.startsWith(webDir) ? cleanPath : null;
}

function tryListen(server: Server, port: number) {
  return new Promise<void>((resolve, reject) => {
    const onError = (err: Error & { code?: string }) => {
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

export type StartWebServerOptions = {
  port?: number;
  maxPortAttempts?: number;
  logger?: (msg: string) => void;
};

export async function startWebServer(options: StartWebServerOptions = {}) {
  const preferred = options.port ?? (Number(process.env.WEB_PORT) || 4173);
  const maxAttempts = options.maxPortAttempts ?? 32;
  const log = options.logger ?? ((msg: string) => console.log(msg));

  const server = createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    const pathname = pathnameOnly(req.url || '/');
    const filePath = safeResolvedPath(WEB_DIST, pathname);

    const sendFile = (path: string) => {
      const type = MIME[extname(path)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      createReadStream(path).pipe(res);
    };

    const trySpaIndex = () => {
      const indexPath = join(WEB_DIST, 'index.html');
      if (existsSync(indexPath)) {
        sendFile(indexPath);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(
          'Not found. Run npm run build:web first so web/dist exists, or use npm run dev:web for Vite.'
        );
      }
    };

    if (filePath && existsSync(filePath) && statSync(filePath).isFile()) {
      sendFile(filePath);
      return;
    }

    if (filePath && existsSync(filePath) && statSync(filePath).isDirectory()) {
      const indexInDir = join(filePath, 'index.html');
      if (existsSync(indexInDir)) {
        sendFile(indexInDir);
        return;
      }
    }

    trySpaIndex();
  });

  let boundPort = preferred;
  for (let i = 0; i < maxAttempts; i++) {
    const port = preferred + i;
    try {
      await tryListen(server, port);
      boundPort = port;
      break;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'EADDRINUSE') {
        throw err;
      }
      if (i === maxAttempts - 1) {
        throw err;
      }
    }
  }

  if (boundPort !== preferred) {
    log(`HTTP http://localhost:${boundPort} (web/dist) — port ${preferred} in use`);
  } else {
    log(`HTTP http://localhost:${boundPort} (web/dist)`);
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
