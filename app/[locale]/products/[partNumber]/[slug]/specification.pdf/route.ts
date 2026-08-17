import { generatePublishedProductSpecificationPdf } from "@/src/application/product-specification-pdf";
import { PRODUCT_ROUTE_PARAMS_SCHEMA } from "@/src/modules/catalog/public/product-identity";

type ProductSpecificationRouteContext = {
  params: Promise<{ locale: string; partNumber: string; slug: string }>;
};

export async function GET(
  _request: Request,
  { params }: ProductSpecificationRouteContext,
): Promise<Response> {
  const parsedParams = PRODUCT_ROUTE_PARAMS_SCHEMA.safeParse(await params);

  if (!parsedParams.success) {
    return new Response(null, { status: 404 });
  }

  const download = await generatePublishedProductSpecificationPdf(
    parsedParams.data,
  );

  if (!download) {
    return new Response(null, { status: 404 });
  }

  const body = new Uint8Array(download.bytes.byteLength);
  body.set(download.bytes);

  return new Response(body.buffer, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${download.filename}"`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
