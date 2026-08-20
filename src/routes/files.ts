import { IncomingMessage, ServerResponse } from 'node:http';
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import Busboy from 'busboy';
import { Readable } from 'node:stream';
import { sendError, sendJson } from '../utils/response';
import { streamFile } from '../utils/stream-utils';

const UPLOAD_DIR = 'uploads';
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Магические числа для PNG и JPEG
const MAGIC_NUMBERS: Record<string, number[]> = {
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/jpeg': [0xff, 0xd8, 0xff, 0xe0],
  // 'image/jpeg': [0xff, 0xd8, 0xff, 0xe1],
};

function checkMagic(buffer: Buffer, magic: number[]): boolean {
  if (buffer.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false;
  }
  return true;
}

function detectMimeType(buffer: Buffer): string | null {
  for (const [mime, magic] of Object.entries(MAGIC_NUMBERS)) {
    if (checkMagic(buffer, magic)) return mime;
  }
  return null;
}

// GET /files/:filename
export function getFile(
  req: IncomingMessage,
  res: ServerResponse,
  filename: string,
) {
  const safe = filename.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._-]/g, '');
  const filePath = join(UPLOAD_DIR, safe);
  const ext = extname(filePath).toLowerCase();
  const contentType =
    ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.txt'
          ? 'text/plain'
          : 'application/octet-stream';
  streamFile(res, filePath, contentType);
}

// POST /upload
export function uploadFile(req: IncomingMessage, res: ServerResponse) {
  let responseSent = false;

  const busboy = Busboy({ headers: req.headers });

  busboy.on(
    'file',
    (
      _fieldname: string,
      fileStream: Readable,
      filename: any, // может быть строкой или объектом { filename: '...' }
      _encoding: string,
      mimetype: string,
    ) => {
      // Приводим filename к строке (защита от объекта)
      const filenameStr =
        typeof filename === 'string'
          ? filename
          : filename?.filename || String(filename);
      const ext = extname(filenameStr);

      console.log('📥 MIME-тип от клиента:', mimetype);
      console.log('📥 Имя файла:', filenameStr);

      // Проверяем допустимый MIME-тип
      if (
        mimetype &&
        !['image/png', 'image/jpeg', 'application/octet-stream'].includes(
          mimetype,
        )
      ) {
        if (!responseSent) {
          responseSent = true;
          sendError(
            res,
            415,
            'Unsupported file type. Only PNG and JPEG allowed.',
          );
        }
        fileStream.resume(); // игнорируем данные
        return;
      }

      const newFilename = `${randomUUID()}${ext}`;
      const savePath = join(UPLOAD_DIR, newFilename);
      const writeStream = createWriteStream(savePath);
      let fileSize = 0;
      let magicBuffer = Buffer.alloc(0);

      fileStream.on('data', (chunk: Buffer) => {
        if (magicBuffer.length < 4) {
          const need = Math.min(4 - magicBuffer.length, chunk.length);
          magicBuffer = Buffer.concat([magicBuffer, chunk.slice(0, need)]);
        }
        fileSize += chunk.length;
        writeStream.write(chunk);
      });

      fileStream.on('end', () => {
        let detectedType: string | null = null;
        if (magicBuffer.length >= 4) {
          detectedType = detectMimeType(magicBuffer);
        }
        if (!detectedType) {
          writeStream.end();
          try {
            unlinkSync(savePath);
          } catch (_) {
            /* ignore */
          }
          if (!responseSent) {
            responseSent = true;
            sendError(res, 415, 'Invalid file signature');
          }
          return;
        }

        writeStream.end();
        if (!responseSent) {
          responseSent = true;
          sendJson(res, 201, {
            message: 'File uploaded successfully',
            filename: newFilename,
            size: fileSize,
            mimetype,
          });
        }
      });

      fileStream.on('error', (err) => {
        console.error('Upload stream error:', err);
        writeStream.destroy();
        if (!responseSent) {
          responseSent = true;
          sendError(res, 500, 'Upload failed');
        }
      });

      writeStream.on('error', (err) => {
        console.error('Write stream error:', err);
        if (!responseSent) {
          responseSent = true;
          sendError(res, 500, 'Failed to save file');
        }
      });
    },
  );

  busboy.on('error', (err) => {
    console.error('Busboy error:', err);
    if (!responseSent) {
      responseSent = true;
      sendError(res, 400, 'Invalid multipart request');
    }
  });

  busboy.on('finish', () => {
    if (!responseSent) {
      responseSent = true;
      sendError(res, 400, 'No file uploaded');
    }
  });

  req.pipe(busboy);
}
