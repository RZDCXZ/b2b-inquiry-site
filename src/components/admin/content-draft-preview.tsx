import type { ReactNode } from "react";

import type { PublicLocale } from "@/src/modules/site-config/public/locales";

export function ContentDraftPreview({
  children,
  locale,
  version,
}: {
  children: ReactNode;
  locale: PublicLocale;
  version: number;
}) {
  return (
    <section className="content-draft-preview">
      <header>
        <strong>未发布草稿预览</strong>
        <span>
          {locale === "en" ? "English" : "简体中文"} · 草稿 v{version}
        </span>
        <p>此画布不会改变前台；确认内容后返回编辑页发布。</p>
      </header>
      <div className="content-draft-preview-canvas">{children}</div>
    </section>
  );
}
