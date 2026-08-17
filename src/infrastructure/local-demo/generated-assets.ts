import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const defaultGeneratedDirectory = path.join(
  process.cwd(),
  ".local",
  "generated",
  "assets",
);
const defaultSourceDirectory = path.join(
  process.cwd(),
  "product-ui",
  "public",
  "assets",
);

export async function regenerateDemoAssets({
  generatedDirectory = defaultGeneratedDirectory,
  sourceDirectory = defaultSourceDirectory,
}: {
  generatedDirectory?: string;
  sourceDirectory?: string;
} = {}): Promise<void> {
  await rm(generatedDirectory, { force: true, recursive: true });
  await mkdir(generatedDirectory, { recursive: true });
  await cp(sourceDirectory, generatedDirectory, { recursive: true });
}

export async function clearTemporaryUploads(
  uploadsDirectory = path.join(process.cwd(), ".local", "uploads"),
): Promise<void> {
  await rm(uploadsDirectory, { force: true, recursive: true });
  await mkdir(uploadsDirectory, { recursive: true });
}
