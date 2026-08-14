import Image, { type StaticImageData } from "next/image";

import filterFamily from "@/product-ui/public/assets/filter-family.png";
import fuelFilter from "@/product-ui/public/assets/fuel-filter-product.png";
import type { getProductDraftPreview } from "@/src/application/product-publishing";

type ProductDraftPreviewView = Awaited<
  ReturnType<typeof getProductDraftPreview>
>;

const productImages: Record<string, StaticImageData> = {
  "/assets/filter-family.png": filterFamily,
  "/assets/fuel-filter-product.png": fuelFilter,
};

export function ProductDraftPreview({
  preview,
}: {
  preview: ProductDraftPreviewView;
}) {
  const chinese = preview.locale === "zh-cn";

  return (
    <div className="product-preview-page">
      <aside className="product-preview-banner" role="status">
        <strong>{chinese ? "草稿预览" : "Draft preview"}</strong>
        <span>
          {chinese
            ? "此画面读取当前草稿，不会改变前台公开版本或站点地图。"
            : "This view reads the current draft and does not change the public version or sitemap."}
        </span>
        <code>draft v{preview.version}</code>
      </aside>
      <article className="product-preview-canvas">
        <header>
          <p>{preview.category}</p>
          <h1>{preview.partNumber}</h1>
          <h2>{preview.name || (chinese ? "未填写名称" : "Missing name")}</h2>
          <span>{preview.summary}</span>
        </header>
        <div className="product-preview-hero">
          <figure>
            <Image
              alt={preview.imageAlt}
              fill
              sizes="(max-width: 900px) 100vw, 45vw"
              src={productImages[preview.imagePath] ?? filterFamily}
            />
          </figure>
          <section>
            <p>{chinese ? "产品描述" : "Product description"}</p>
            <h2>{preview.description}</h2>
            <div className="product-preview-seo">
              <small>SEO</small>
              <strong>{preview.seoTitle}</strong>
              <span>{preview.seoDescription}</span>
            </div>
          </section>
        </div>
        <section className="product-preview-section">
          <header>
            <p>{chinese ? "分类规格" : "Category specifications"}</p>
            <h2>{chinese ? "完整规格" : "Full specifications"}</h2>
          </header>
          <table>
            <tbody>
              {preview.specifications.map((specification) => (
                <tr key={specification.code}>
                  <th scope="row">{specification.label}</th>
                  <td>
                    {specification.value}
                    {specification.unit ? " " + specification.unit : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="product-preview-columns">
          <article>
            <p>{chinese ? "适配摘要" : "Fitment summary"}</p>
            <h2>{preview.fitmentSummary}</h2>
            {preview.fitments.map((fitment) => (
              <span
                key={
                  fitment.make +
                  fitment.model +
                  fitment.engine +
                  fitment.yearFrom
                }
              >
                {fitment.make} {fitment.model} · {fitment.yearFrom}–
                {fitment.yearTo} · {fitment.engine}
              </span>
            ))}
          </article>
          <article>
            <p>{chinese ? "参考号" : "Cross-reference numbers"}</p>
            <h2>{preview.partNumber}</h2>
            {preview.references.map((reference) => (
              <span key={reference.brand + reference.referenceNumber}>
                {reference.brand} · {reference.referenceNumber}
              </span>
            ))}
          </article>
        </section>
      </article>
    </div>
  );
}
