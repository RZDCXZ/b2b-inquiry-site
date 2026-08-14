import { z } from "zod";

import { getApplicationPrisma } from "@/src/infrastructure/database/prisma";
import { readUploadedAsset } from "@/src/infrastructure/local-demo/uploaded-assets";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
): Promise<Response> {
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).assetId);
  if (!parsed.success) {
    return new Response(null, { status: 404 });
  }

  const asset = await getApplicationPrisma().asset.findFirst({
    select: { mimeType: true, storageFilename: true },
    where: { id: parsed.data, kind: "image", source: "uploaded" },
  });
  if (!asset) {
    return new Response(null, { status: 404 });
  }

  const bytes = await readUploadedAsset({
    storageFilename: asset.storageFilename,
  });
  const body = new Uint8Array(bytes);

  return new Response(body.buffer, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "Content-Type": asset.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
