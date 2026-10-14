import { del, get, put } from "@vercel/blob";

const BLOB_PREFIX = "blob:";

export function isBlobPath(value: string): boolean {
  return value.startsWith(BLOB_PREFIX);
}

export function blobPathname(value: string): string {
  return value.startsWith(BLOB_PREFIX) ? value.slice(BLOB_PREFIX.length) : value;
}

function requireBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured. Connect a private Vercel Blob store to this project.");
  }
}

/** Store files privately; database columns keep a `blob:` pathname, not a public URL. */
export async function savePrivateBlob(pathname: string, body: Buffer, contentType: string) {
  requireBlobToken();
  const result = await put(pathname, body, {
    access: "private",
    addRandomSuffix: false,
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return `${BLOB_PREFIX}${result.pathname}`;
}

/** Reads a private Blob into memory only when processing, downloading or emailing requires it. */
export async function readPrivateBlob(pathOrUrl: string): Promise<Buffer | null> {
  requireBlobToken();
  try {
    const result = await get(blobPathname(pathOrUrl), {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result || result.statusCode !== 200) return null;
    
const chunks: Buffer[] = [];
const reader = result.stream.getReader();

try {
  while (true) {
    const { done, value } = await reader.read();

    if (done) break;
    if (value) chunks.push(Buffer.from(value));
  }
} finally {
  reader.releaseLock();
}

return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export async function deletePrivateBlob(pathOrUrl: string): Promise<void> {
  if (!isBlobPath(pathOrUrl)) return;
  requireBlobToken();
  await del(blobPathname(pathOrUrl), { token: process.env.BLOB_READ_WRITE_TOKEN });
}
