import { ServerResponse } from 'node:http';
import { ApiResponse } from '../types';

export function sendJson(
  res: ServerResponse,
  status: number,
  data: any,
  message = '',
) {
  const payload: ApiResponse = {
    status,
    message: message || (status >= 400 ? 'Error' : 'Success'),
    data,
  };
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

export function sendError(
  res: ServerResponse,
  status: number,
  message: string,
) {
  sendJson(res, status, null, message);
}
