import { generateProductDraftSpecificationPdf } from "@/src/application/product-specification-pdf";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeRequest } from "@/src/modules/identity-access/server/authorization";
import { PUBLIC_LOCALE_SCHEMA } from "@/src/modules/site-config/public/locales";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ locale: string; partNumber: string }>;
  },
): Promise<Response> {
  const { locale, partNumber } = await params;
  const parsedLocale = PUBLIC_LOCALE_SCHEMA.safeParse(locale);
  if (!parsedLocale.success) {
    return new Response(null, { status: 404 });
  }

  const { actor, decision } = await authorizeRequest(
    request.headers,
    PERMISSIONS.PRODUCTS_MANAGE,
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

  const download = await generateProductDraftSpecificationPdf({
    actor,
    locale: parsedLocale.data,
    partNumber,
  });
  const body = new Uint8Array(download.bytes);

  return new Response(body.buffer, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${download.filename}"`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
