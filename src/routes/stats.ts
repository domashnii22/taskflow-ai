import { IncomingMessage, ServerResponse } from 'node:http';
import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import { sendJson, sendError } from '../utils/response';
import { tasks } from './tasks';

export function getStats(req: IncomingMessage, res: ServerResponse) {
  const workerPath = join(__dirname, '..', 'workers', 'stats.worker.ts');

  // Создаём воркер с явным указанием tsconfig.json
  const worker = new Worker(workerPath, {
    workerData: { tasks },
    env: {
      ...process.env,
      TS_NODE_PROJECT: './tsconfig.json', // указываем путь к tsconfig
    },
    execArgv: ['-r', 'ts-node/register'], // загружаем ts-node
  });

  let responded = false;

  worker.on('message', (result) => {
    if (!responded) {
      responded = true;
      if (result.error) {
        sendError(res, 500, result.error);
      } else {
        sendJson(res, 200, result);
      }
    }
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
    if (!responded) {
      responded = true;
      sendError(res, 500, 'Worker error');
    }
  });

  worker.on('exit', (code) => {
    if (code !== 0 && !responded) {
      responded = true;
      sendError(res, 500, `Worker exited with code ${code}`);
    }
  });
}
