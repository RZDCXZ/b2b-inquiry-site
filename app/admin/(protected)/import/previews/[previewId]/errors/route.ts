import {
  createProductImportErrorReport,
  PRODUCT_IMPORT_XLSX_MIME,
  ProductImportError,
} from "@/src/application/product-import";
import { z } from "zod";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeRequest } from "@/src/modules/identity-access/server/authorization";

export const runtime = "nodejs";
const routeParamsSchema = z.object({ previewId: z.string().uuid() });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ previewId: string }> },
): Promise<Response> {
  const { actor, decision } = await authorizeRequest(
    request.headers,
    PERMISSIONS.IMPORTS_MANAGE,
  );
  if (!decision.allowed) {
    return Response.json(
      { code: decision.code, message: decision.message },
      { status: decision.status },
    );
  }
  if (!actor) {
    return Response.json(
      { code: "UNAUTHENTICATED", message: "请先登录运营后台。" },
      { status: 401 },
    );
  }
  const parsedParams = routeParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return Response.json(
      { code: "INVALID_ROUTE_PARAMETER", message: "预览标识无效。" },
      { status: 400 },
    );
  }
  const { previewId } = parsedParams.data;
  try {
    const bytes = await createProductImportErrorReport({ actor, previewId });
    return new Response(bytes.buffer as ArrayBuffer, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="torquelis-import-errors-${previewId}.xlsx"`,
        "Content-Type": PRODUCT_IMPORT_XLSX_MIME,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ProductImportError && error.code === "NOT_FOUND") {
      return new Response(null, { status: 404 });
    }
    throw error;
  }
}
