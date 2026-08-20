import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { IncomingMessage, ServerResponse } from 'node:http';

// Абсолютный путь к папке логов (относительно корня проекта)
const PROJECT_ROOT = resolve(__dirname, '../..'); // если logger.ts в src/middleware/
const LOG_DIR = resolve(PROJECT_ROOT, 'logs');
const LOG_FILE = resolve(LOG_DIR, 'access.log');

// Создаём папку, если её нет
try {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
    console.log(`📁 Создана папка: ${LOG_DIR}`);
  }
  console.log(`📁 Путь к логам: ${LOG_FILE}`);
} catch (err) {
  console.error('❌ Ошибка создания папки логов:', err);
}

export function logRequest(
  req: IncomingMessage,
  res: ServerResponse,
  startTime: number,
) {
  const { method, url } = req;
  const statusCode = res.statusCode || 200;
  const duration = Date.now() - startTime;
  const logLine = `[${new Date().toISOString()}] ${method} ${url} - ${statusCode} - ${duration}ms\n`;

  // Вывод в консоль (для отладки)
  console.log('📝 Лог:', logLine.trim());

  // Попытка записи в файл с обработкой ошибок
  try {
    appendFileSync(LOG_FILE, logLine, 'utf8');
    console.log(`✅ Лог записан в файл: ${LOG_FILE}`);
  } catch (err) {
    console.error('❌ Ошибка записи в лог-файл:', err);
    // Дополнительная информация об ошибке
    if (err instanceof Error) {
      console.error('  Сообщение:', err.message);
      console.error('  Код:', (err as any).code);
      console.error('  Путь:', LOG_FILE);
    }
  }
}

// Тестовая запись при загрузке модуля (для проверки)
try {
  appendFileSync(
    LOG_FILE,
    `--- Server started at ${new Date().toISOString()} ---\n`,
    'utf8',
  );
  console.log('✅ Тестовая запись в лог выполнена');
} catch (err) {
  console.error('❌ Не удалось записать тестовый лог:', err);
}
