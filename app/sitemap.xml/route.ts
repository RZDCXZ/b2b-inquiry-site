import {
  listPublicSitemapEntries,
  renderSitemapXml,
} from "@/src/application/public-sitemap";
import { isPublicSeoMode } from "@/src/modules/site-config/server/seo-mode";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!isPublicSeoMode()) {
    return new Response(null, {
      headers: { "X-Robots-Tag": "noindex" },
      status: 404,
    });
  }

  return new Response(renderSitemapXml(await listPublicSitemapEntries()), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
