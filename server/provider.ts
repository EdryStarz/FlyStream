import { HttpError } from './security.ts';

export function providerEndpoint(base: string, path: string): URL {
  let endpoint: URL;
  try { endpoint = new URL(path, `${base.replace(/\/$/, '')}/`); }
  catch { throw new HttpError(500, 'Invalid server-side provider endpoint.'); }
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname)))) {
    throw new HttpError(500, 'Provider endpoint must use HTTPS or loopback without URL credentials.');
  }
  return endpoint;
}

export function validReservation(value: string | undefined): boolean {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= 5;
}

/** Enforce the bound while streaming; Content-Length alone is not trusted. */
export async function boundedResponse(response: Response, max: number): Promise<Buffer> {
  if (!response.body) throw new HttpError(502, 'Provider returned no body.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); throw new HttpError(502, 'Provider response exceeded limit.'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
