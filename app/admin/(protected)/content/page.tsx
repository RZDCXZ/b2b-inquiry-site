import {
  ArrowRight,
  BookOpenText,
  FileText,
  LockKey,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import {
  listArticleDrafts,
  listCorePageDrafts,
} from "@/src/application/site-content-management";
import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function ContentPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.CONTENT_MANAGE,
    "/admin/content",
  );
  if (!allowed) return <PermissionDenied role={actor.role} />;
  const [pages, articles] = await Promise.all([
    listCorePageDrafts({ actor }),
    listArticleDrafts({ actor }),
  ]);
  return (
    <>
      <AdminPageHeader
        description="核心页面中英文一起发布；文章按语言独立发布。所有发布与归档都形成不可变版本。"
        eyebrow="内容发布"
        title="核心页面与文章"
      />
      <aside className="content-version-boundary">
        <LockKey aria-hidden="true" />
        <div>
          <strong>恢复只创建新草稿</strong>
          <p>历史版本不会被覆盖；恢复后必须重新检查并发布，前台才会改变。</p>
        </div>
      </aside>
      <section className="content-management-section">
        <header>
          <div>
            <p>预设强类型版块</p>
            <h2>核心页面</h2>
          </div>
          <span>6 个页面 · 中英文同时校验</span>
        </header>
        <div className="core-page-list">
          {pages.map((page) => (
            <Link href={`/admin/content/pages/${page.key}`} key={page.key}>
              <FileText aria-hidden="true" />
              <span>
                <strong>{page.label}</strong>
                <small>
                  草稿 v{page.version} ·{" "}
                  {page.status === "archived"
                    ? "已归档"
                    : page.lastPublishedVersion === page.version
                      ? "已发布"
                      : "有未发布修改"}
                </small>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
      <section className="content-management-section">
        <header>
          <div>
            <p>受限富文本</p>
            <h2>技术文章</h2>
          </div>
          <span>{articles.length} 个主题 · 语言独立发布</span>
        </header>
        <div className="article-management-list">
          {articles.map((article) => (
            <article key={article.id}>
              <div>
                <BookOpenText aria-hidden="true" />
                <span>
                  <strong>
                    {article.translations.en?.title ??
                      article.translations["zh-cn"]?.title ??
                      article.topicKey}
                  </strong>
                  <small>{article.topicKey}</small>
                </span>
              </div>
              {(["en", "zh-cn"] as const).map((locale) => {
                const translation = article.translations[locale];
                return translation ? (
                  <Link
                    href={`/admin/content/articles/${article.id}/${locale}`}
                    key={locale}
                  >
                    <span>{locale === "en" ? "English" : "简体中文"}</span>
                    <b>
                      {translation.status === "archived"
                        ? "已归档"
                        : translation.lastPublishedVersion ===
                            translation.version
                          ? "已发布"
                          : "草稿"}
                    </b>
                    <ArrowRight />
                  </Link>
                ) : (
                  <span className="article-language-missing" key={locale}>
                    {locale === "en" ? "English" : "简体中文"}
                    <b>暂无版本</b>
                  </span>
                );
              })}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
