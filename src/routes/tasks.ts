import { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson, sendError } from '../utils/response';
import { parseJsonBody } from '../utils/body-parser';
import { Task } from '../types';
import { randomUUID } from 'node:crypto';

// In-memory хранилище
const tasks: Task[] = [];

// Вспомогательная функция поиска задачи
function findTask(id: string): Task | undefined {
  return tasks.find((t) => t.id === id);
}

// --- Обработчики ---

// GET /tasks - возвращает список задач (с демонстрацией nextTick)
export async function getTasks(req: IncomingMessage, res: ServerResponse) {
  // 🔥 Демонстрация nextTick: выполняется до любого I/O
  process.nextTick(() => {
    console.log('[nextTick] Логирование: запрос на получение задач');
  });

  // 🔥 Демонстрация setImmediate (выполнится после I/O)
  setImmediate(() => {
    console.log('[setImmediate] Это будет после всех I/O операций');
  });

  // 🔥 Демонстрация setTimeout (в фазе таймеров)
  setTimeout(() => {
    console.log('[setTimeout] Это будет в следующем тике Event Loop');
  }, 0);

  Promise.resolve().then(() => {
    console.log(
      '[Promise] Микрозадача, выполняется после nextTick, но до setImmediate',
    );
  });

  // Основной ответ
  sendJson(res, 200, tasks);
}

// POST /tasks - создание задачи
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
    sendJson(res, 201, newTask);
  } catch (err) {
    sendError(res, 400, err instanceof Error ? err.message : 'Bad request');
  }
}

// GET /tasks/:id - получение задачи по ID
export async function getTaskById(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
) {
  const task = findTask(id);
  if (!task) {
    return sendError(res, 404, 'Task not found');
  }
  sendJson(res, 200, task);
}

// PUT /tasks/:id - обновление задачи
export async function updateTask(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
) {
  const task = findTask(id);
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

    sendJson(res, 200, task);
  } catch (err) {
    sendError(res, 400, err instanceof Error ? err.message : 'Bad request');
  }
}

// DELETE /tasks/:id - удаление задачи
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
  sendJson(res, 200, { message: 'Task deleted' });
}
