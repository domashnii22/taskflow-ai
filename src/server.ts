import { createServer, IncomingMessage } from 'node:http';
import {
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
} from './routes/tasks';
import { blockEventLoop } from './routes/block';
import { sendError } from './utils/response';

// Логирование запросов (stream-based — будет доработано позже, пока просто console)
function logRequest(req: IncomingMessage) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
}

const server = createServer((req, res) => {
  logRequest(req);

  // Разбор URL и метода
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method || 'GET';

  // --- Роутинг ---

  // GET /tasks
  if (method === 'GET' && path === '/tasks') {
    return getTasks(req, res);
  }

  // POST /tasks
  if (method === 'POST' && path === '/tasks') {
    return createTask(req, res);
  }

  // GET /tasks/:id
  const taskIdMatch = path.match(/^\/tasks\/([a-f0-9-]+)$/);
  if (method === 'GET' && taskIdMatch) {
    const id = taskIdMatch[1];
    return getTaskById(req, res, id);
  }

  // PUT /tasks/:id
  if (method === 'PUT' && taskIdMatch) {
    const id = taskIdMatch[1];
    return updateTask(req, res, id);
  }

  // DELETE /tasks/:id
  if (method === 'DELETE' && taskIdMatch) {
    const id = taskIdMatch[1];
    return deleteTask(req, res, id);
  }

  // GET /block (временно)
  if (method === 'GET' && path === '/block') {
    return blockEventLoop(req, res);
  }

  // 404
  sendError(res, 404, 'Not Found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Tasks API: /tasks`);
  console.log(`⛔ Blocking demo: /block (use with caution!)`);
});
