import { isPublicSeoMode } from "@/src/modules/site-config/server/seo-mode";

function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function PublicStructuredData({ data }: { data: unknown }) {
  if (!isPublicSeoMode()) return null;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: scriptSafeJson(data) }}
      type="application/ld+json"
    />
  );
}
