import {
  createProductImportTemplate,
  PRODUCT_IMPORT_XLSX_MIME,
} from "@/src/application/product-import";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeRequest } from "@/src/modules/identity-access/server/authorization";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
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
  const bytes = await createProductImportTemplate();
  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition":
        'attachment; filename="torquelis-product-import-template.xlsx"',
      "Content-Type": PRODUCT_IMPORT_XLSX_MIME,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
