
import { del, get, put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage");
const BLOB_PREFIX = "blob:";

export async function storePrivateFile(
  folder: "uploads" | "reports",
  filename: string,
  contents: Buffer,
  contentType = "application/octet-stream"
): Promise<string> {
  const blob = await put(
    `${folder}/${Date.now()}-${filename}`,
    contents,
    {
      access: "private",
      addRandomSuffix: true,
      contentType,
    }
  );

  // Save the private Blob pathname in the database, not its URL.
  return `${BLOB_PREFIX}${blob.pathname}`;
}

export async function readStoredFile(
  storedPath: string
): Promise<Buffer | null> {
  try {
    if (storedPath.startsWith(BLOB_PREFIX)) {
      const pathname = storedPath.slice(BLOB_PREFIX.length);
      const result = await get(pathname, { access: "private" });

      if (!result || result.statusCode !== 200 || !result.stream) {
        return null;
      }

      return Buffer.from(
        await new Response(result.stream).arrayBuffer()
      );
    }

    // Support legacy local files during local development.
    const resolved = path.resolve(storedPath);

    if (
      resolved !== STORAGE_ROOT &&
      !resolved.startsWith(`${STORAGE_ROOT}${path.sep}`)
    ) {
      return null;
    }

    return await fs.readFile(resolved);
  } catch {
    return null;
  }
}

export async function deleteStoredFile(
  storedPath: string
): Promise<void> {
  try {
    if (storedPath.startsWith(BLOB_PREFIX)) {
      await del(storedPath.slice(BLOB_PREFIX.length), {
        access: "private",
      });
      return;
    }

    const resolved = path.resolve(storedPath);

    if (
      resolved !== STORAGE_ROOT &&
      resolved.startsWith(`${STORAGE_ROOT}${path.sep}`)
    ) {
      await fs.unlink(resolved).catch(() => undefined);
    }
  } catch (error) {
    console.error("Unable to delete stored file:", error);
  }
}
