import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  statSync,
} from 'node:fs';
import { IncomingMessage, ServerResponse } from 'node:http';

// Убедимся, что папка logs существует
if (!existsSync('logs')) {
  mkdirSync('logs');
}

// Создаём стрим для записи логов (флаг 'a' — append)
const logStream = createWriteStream('logs/access.log', { flags: 'a' });

// Функция логирования
export function logRequest(
  req: IncomingMessage,
  res: ServerResponse,
  startTime: number,
) {
  const { method, url } = req;
  const statusCode = res.statusCode;
  const duration = Date.now() - startTime;
  const logLine = `[${new Date().toISOString()}] ${method} ${url} - ${statusCode} - ${duration}ms\n`;

  // Пишем в стрим (асинхронно, без буферизации)
  logStream.write(logLine);
}

export function streamFile(
  res: ServerResponse,
  filePath: string,
  contentType?: string,
) {
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('File not found');
    return;
  }

  const stat = statSync(filePath);
  const totalSize = stat.size;

  res.writeHead(200, {
    'Content-Type': contentType || 'application/octet-stream',
    'Content-Length': totalSize,
    'Cache-Control': 'public, max-age=3600',
  });

  const readStream = createReadStream(filePath);
  readStream.pipe(res);

  readStream.on('error', (err) => {
    console.error('Stream error:', err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Internal Server Error');
    } else {
      res.destroy();
    }
  });

  res.on('close', () => {
    readStream.destroy();
  });
}
