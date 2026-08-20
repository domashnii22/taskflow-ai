import { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from '../utils/response';

export function blockEventLoop(req: IncomingMessage, res: ServerResponse) {
  // ⛔ ИСКУССТВЕННАЯ БЛОКИРОВКА НА 5 СЕКУНД
  const start = Date.now();
  while (Date.now() - start < 5000) {
    // Пустой цикл — блокирует Event Loop
  }

  sendJson(res, 200, { message: 'Блокировка завершена, прошло 5 секунд' });
}
