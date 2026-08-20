import { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { sendJson, sendError } from '../utils/response';
import { parseJsonBody } from '../utils/body-parser';
import { Task } from '../types';
import { LRUCache } from '../cache/lru-cache';

// In-memory хранилище задач
export const tasks: Task[] = [];

// Создаём экземпляр кэша на 100 записей, TTL 30 секунд
const tasksCache = new LRUCache<string, Task[]>(100, 30000);

// Вспомогательная функция для инвалидации кэша
function invalidateTasksCache() {
  tasksCache.delete('all-tasks');
  console.log('🗑️ Кэш задач инвалидирован');
}

// --- GET /tasks ---
export async function getTasks(req: IncomingMessage, res: ServerResponse) {
  // Пытаемся получить данные из кэша
  const cached = tasksCache.get('all-tasks');
  if (cached) {
    console.log('💾 Ответ из кэша');
    return sendJson(res, 200, cached);
  }

  console.log('⏳ Кэш не найден, генерируем новый ответ');
  // Если кэша нет, возвращаем данные и сохраняем в кэш
  sendJson(res, 200, tasks);
  tasksCache.set('all-tasks', tasks);
}

// --- POST /tasks ---
export async function createTask(req: IncomingMessage, res: ServerResponse) {
  try {
    const body = await parseJsonBody(req);
    const { title, description, status = 'todo' } = body;

    if (!title || typeof title !== 'string') {
      return sendError(res, 400, 'Title is required and must be string');
    }

    const newTask: Task = {
      id: randomUUID(),
      title,
      description: description || '',
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tasks.push(newTask);
    invalidateTasksCache(); // инвалидируем кэш
    sendJson(res, 201, newTask);
  } catch (err) {
    sendError(res, 400, err instanceof Error ? err.message : 'Bad request');
  }
}

// --- GET /tasks/:id ---
export async function getTaskById(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
) {
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return sendError(res, 404, 'Task not found');
  }
  sendJson(res, 200, task);
}

// --- PUT /tasks/:id ---
export async function updateTask(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
) {
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return sendError(res, 404, 'Task not found');
  }

  try {
    const body = await parseJsonBody(req);
    const { title, description, status } = body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) {
      if (!['todo', 'in-progress', 'done'].includes(status)) {
        return sendError(res, 400, 'Invalid status');
      }
      task.status = status;
    }
    task.updatedAt = new Date();

    invalidateTasksCache();
    sendJson(res, 200, task);
  } catch (err) {
    sendError(res, 400, err instanceof Error ? err.message : 'Bad request');
  }
}

// --- DELETE /tasks/:id ---
export async function deleteTask(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
) {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    return sendError(res, 404, 'Task not found');
  }
  tasks.splice(index, 1);
  invalidateTasksCache();
  sendJson(res, 200, { message: 'Task deleted' });
}
