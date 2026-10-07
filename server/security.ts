import type { IncomingMessage, ServerResponse } from 'node:http';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function cleanText(value: unknown, max = 300): string {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, max).trim();
}

export function header(req: IncomingMessage, name: string): string {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value ?? '';
}

export function trustedRequest(req: IncomingMessage, origins: Set<string>, mutation = false): boolean {
  const host = header(req, 'host');
  const allowedHosts = new Set([...origins].map(origin => new URL(origin).host));
  if (!allowedHosts.has(host)) return false;
  const origin = header(req, 'origin');
  if (origin && !origins.has(origin)) return false;
  if (mutation && !origin) return false;
  const site = header(req, 'sec-fetch-site');
  return site !== 'cross-site';
}

export function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

export async function readBody(req: IncomingMessage, max: number): Promise<Buffer> {
  const length = Number(header(req, 'content-length'));
  if (Number.isFinite(length) && length > max) throw new HttpError(413, 'Request exceeds size limit.');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > max) throw new HttpError(413, 'Request exceeds size limit.');
    chunks.push(new Uint8Array(chunk));
  }
  return Buffer.concat(chunks);
}

export async function readJson(req: IncomingMessage, max = 32_768): Promise<Record<string, unknown>> {
  if (header(req, 'content-type').split(';')[0] !== 'application/json') throw new HttpError(415, 'Send application/json.');
  try {
    const body: unknown = JSON.parse((await readBody(req, max)).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('object required');
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Invalid JSON object.');
  }
}

export class RateLimiter {
  private entries = new Map<string, { start: number; count: number }>();
  take(key: string, limit: number, interval: number, now = Date.now()): boolean {
    let entry = this.entries.get(key);
    if (!entry || now - entry.start >= interval) {
      entry = { start: now, count: 0 };
      this.entries.set(key, entry);
    }
    if (this.entries.size > 2000) for (const [id, item] of this.entries) if (now - item.start > 60_000) this.entries.delete(id);
    return ++entry.count <= limit;
  }
}

export function byteRange(value: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2]) || size < 1) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(size - 1, Number(match[2])) : size - 1) : size - 1;
  if (![start, end].every(Number.isSafeInteger) || start < 0 || start >= size || start > end || (!match[1] && Number(match[2]) < 1)) return null;
  return { start, end };
}

export const mediaTypes: Record<string, string> = {
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv',
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
};

export function mediaMagic(bytes: Buffer, type: string): boolean {
  if (bytes.length < 12) return false;
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes.subarray(0, 8).equals(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === 'image/gif') return /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString());
  if (type === 'image/webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (type === 'video/mp4') return bytes.subarray(4, 8).toString() === 'ftyp';
  if (type === 'video/webm') return bytes.subarray(0, 4).equals(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]));
  return type === 'video/ogg' && bytes.subarray(0, 4).toString() === 'OggS';
}
