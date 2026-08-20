import { parentPort, workerData } from 'node:worker_threads';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  createdAt: Date;
  updatedAt: Date;
}

function calculateStats(tasks: Task[]) {
  const total = tasks.length;
  const todo = tasks.filter((t) => t.status === 'todo').length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
  const done = tasks.filter((t) => t.status === 'done').length;
  return { total, todo, inProgress, done };
}

try {
  const { tasks } = workerData as { tasks: Task[] };
  const stats = calculateStats(tasks);
  parentPort?.postMessage(stats);
} catch (err) {
  parentPort?.postMessage({
    error: err instanceof Error ? err.message : 'Unknown error',
  });
}
