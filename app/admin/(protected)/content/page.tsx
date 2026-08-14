import { ArrowRight, LockKey } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { listRecentProductPublications } from "@/src/application/product-publishing";
import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import { formatAdminTime } from "@/src/components/admin/admin-time";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function ContentPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.CONTENT_MANAGE,
    "/admin/content",
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  const publications = await listRecentProductPublications({ actor });

  return (
    <>
      <AdminPageHeader
        description="每次发布保存完整产品公开表示；恢复历史版本只会创建新草稿。"
        eyebrow="内容发布 / 发布版本"
        title="不可变发布历史"
      />
      <aside className="content-version-boundary">
        <LockKey aria-hidden="true" />
        <div>
          <strong>发布版本只读</strong>
          <p>
            版本内容、规格、参考号和适配关系不会被后续编辑覆盖。请进入产品草稿恢复并重新发布。
          </p>
        </div>
      </aside>
      <section className="admin-section content-version-list">
        {publications.map((publication) => (
          <article key={publication.id}>
            <strong>v{publication.version}</strong>
            <span>
              <b>
                {publication.product.partNumber} · {publication.nameZhCn}
              </b>
              <small>
                {publication.publishedBy?.name ?? "系统"} ·{" "}
                {formatAdminTime(publication.publishedAt)}
                {publication.restoredFromPublicationId
                  ? " · 来自历史恢复草稿"
                  : ""}
              </small>
            </span>
            <span
              className={
                publication.product.currentPublicationId === publication.id
                  ? "content-current-version"
                  : "content-history-version"
              }
            >
              {publication.product.currentPublicationId === publication.id
                ? "当前公开"
                : "历史版本"}
            </span>
            <Link
              href={
                "/admin/products/" +
                encodeURIComponent(publication.product.partNumber)
              }
            >
              查看产品与恢复 <ArrowRight aria-hidden="true" />
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}
