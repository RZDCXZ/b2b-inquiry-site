import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const generatedDirectory = path.join(
  process.cwd(),
  ".local",
  "generated",
  "assets",
);
const sourceDirectory = path.join(
  process.cwd(),
  "product-ui",
  "public",
  "assets",
);

export async function regenerateDemoAssets(): Promise<void> {
  await rm(generatedDirectory, { force: true, recursive: true });
  await mkdir(generatedDirectory, { recursive: true });
  await cp(sourceDirectory, generatedDirectory, { recursive: true });
  await writeFile(
    path.join(generatedDirectory, "manifest.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "product-ui/public/assets",
        usage: "Fictional Torquelis demo assets",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

export async function clearTemporaryUploads(): Promise<void> {
  const uploadsDirectory = path.join(process.cwd(), ".local", "uploads");
  await rm(uploadsDirectory, { force: true, recursive: true });
  await mkdir(uploadsDirectory, { recursive: true });
}
