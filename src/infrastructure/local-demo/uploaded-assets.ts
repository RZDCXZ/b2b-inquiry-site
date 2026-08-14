import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_UPLOAD_DIRECTORY = path.join(
  process.cwd(),
  ".local",
  "uploads",
);

function resolveStoragePath(
  storageFilename: string,
  storageDirectory: string,
): string {
  if (
    !storageFilename ||
    path.basename(storageFilename) !== storageFilename ||
    storageFilename.includes("\\")
  ) {
    throw new Error("Unsafe uploaded asset storage filename.");
  }

  return path.join(storageDirectory, storageFilename);
}

export async function writeUploadedAsset({
  bytes,
  storageDirectory = DEFAULT_UPLOAD_DIRECTORY,
  storageFilename,
}: {
  bytes: Uint8Array;
  storageDirectory?: string;
  storageFilename: string;
}): Promise<void> {
  await mkdir(storageDirectory, { recursive: true });
  await writeFile(
    resolveStoragePath(storageFilename, storageDirectory),
    bytes,
    { flag: "wx", mode: 0o600 },
  );
}

export async function readUploadedAsset({
  storageDirectory = DEFAULT_UPLOAD_DIRECTORY,
  storageFilename,
}: {
  storageDirectory?: string;
  storageFilename: string;
}): Promise<Uint8Array> {
  const bytes = await readFile(
    /* turbopackIgnore: true */
    resolveStoragePath(storageFilename, storageDirectory),
  );
  return new Uint8Array(bytes);
}

export async function deleteUploadedAsset({
  storageDirectory = DEFAULT_UPLOAD_DIRECTORY,
  storageFilename,
}: {
  storageDirectory?: string;
  storageFilename: string;
}): Promise<void> {
  await rm(resolveStoragePath(storageFilename, storageDirectory), {
    force: true,
  });
}
