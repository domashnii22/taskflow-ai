import { createServer } from 'node:http';
import {
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
} from './routes/tasks';
import { blockEventLoop } from './routes/block';
import { getFile, uploadFile } from './routes/files';
import { logRequest } from './middleware/logger';
import { sendError } from './utils/response';

const server = createServer((req, res) => {
  const startTime = Date.now();

  // Разбор URL
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method || 'GET';

  // --- Роутинг ---

  // GET /tasks
  if (method === 'GET' && path === '/tasks') {
    getTasks(req, res).finally(() => logRequest(req, res, startTime));
    return;
  }

  // POST /tasks
  if (method === 'POST' && path === '/tasks') {
    createTask(req, res).finally(() => logRequest(req, res, startTime));
    return;
  }

  // GET /tasks/:id
  const taskIdMatch = path.match(/^\/tasks\/([a-f0-9-]+)$/);
  if (method === 'GET' && taskIdMatch) {
    getTaskById(req, res, taskIdMatch[1]).finally(() =>
      logRequest(req, res, startTime),
    );
    return;
  }

  // PUT /tasks/:id
  if (method === 'PUT' && taskIdMatch) {
    updateTask(req, res, taskIdMatch[1]).finally(() =>
      logRequest(req, res, startTime),
    );
    return;
  }

  // DELETE /tasks/:id
  if (method === 'DELETE' && taskIdMatch) {
    deleteTask(req, res, taskIdMatch[1]).finally(() =>
      logRequest(req, res, startTime),
    );
    return;
  }

  // GET /files/:filename
  const fileMatch = path.match(/^\/files\/(.+)$/);
  if (method === 'GET' && fileMatch) {
    getFile(req, res, fileMatch[1]);
    // Логируем после завершения (стрим сам закроется)
    res.on('finish', () => logRequest(req, res, startTime));
    return;
  }

  // POST /upload
  if (method === 'POST' && path === '/upload') {
    uploadFile(req, res);
    res.on('finish', () => logRequest(req, res, startTime));
    return;
  }

  // GET /block (временно)
  if (method === 'GET' && path === '/block') {
    blockEventLoop(req, res);
    logRequest(req, res, startTime);
    return;
  }

  // 404
  sendError(res, 404, 'Not Found');
  logRequest(req, res, startTime);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Tasks API: /tasks`);
  console.log(`📁 Files: GET /files/:filename`);
  console.log(`📤 Upload: POST /upload (multipart/form-data)`);
  console.log(`⛔ Blocking demo: /block (use with caution!)`);
});
