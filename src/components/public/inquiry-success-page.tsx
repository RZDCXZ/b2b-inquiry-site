import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { PublishedProductDetail } from "@/src/application/public-catalog";
import type { PublicSiteShellData } from "@/src/application/public-site-shell";
import { PublicFooter } from "@/src/components/public/public-footer";
import { PublicHeader } from "@/src/components/public/public-header";
import { getHomeCopy } from "@/src/modules/content-publishing/public/home-copy";
import { getInquiryCopy } from "@/src/modules/content-publishing/public/inquiry-copy";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

export function InquirySuccessPage({
  locale,
  product,
  referenceNumber,
  shell,
}: {
  locale: PublicLocale;
  product: PublishedProductDetail | null;
  referenceNumber: string;
  shell: PublicSiteShellData;
}) {
  const copy = getInquiryCopy(locale);
  const homeCopy = getHomeCopy(locale);
  const successHref = (targetLocale: PublicLocale) =>
    `/${targetLocale}/inquiry/success?reference=${encodeURIComponent(referenceNumber)}`;

  return (
    <div className="public-shell">
      <PublicHeader
        activeNavigationAnchor="contact"
        descriptor={homeCopy.brandDescriptor}
        languageHrefs={{
          en: successHref("en"),
          "zh-cn": successHref("zh-cn"),
        }}
        languageLabel={homeCopy.languageLabel}
        locale={locale}
        mobileNavigationLabel={homeCopy.mobileNavigationLabel}
        navigation={homeCopy.nav}
        primaryNavigationLabel={homeCopy.primaryNavigationLabel}
        visibleNavigationAnchors={shell.visibleNavigationAnchors}
      />
      <main className="inquiry-success-page">
        <CheckCircle aria-hidden="true" size={62} weight="thin" />
        <p className="eyebrow">{copy.successEyebrow}</p>
        <h1>{copy.successHeading}</h1>
        <dl>
          <div>
            <dt>{copy.successReference}</dt>
            <dd data-testid="inquiry-reference">{referenceNumber}</dd>
          </div>
          {product ? (
            <div>
              <dt>{copy.successProduct}</dt>
              <dd>{product.partNumber}</dd>
            </div>
          ) : null}
        </dl>
        <p>{copy.successLede}</p>
        <nav>
          {product ? (
            <Link className="primary-button" href={product.href}>
              {copy.successReturnProduct}
            </Link>
          ) : null}
          <Link
            className={product ? "secondary-button" : "primary-button"}
            href={`/${locale}/products`}
          >
            {copy.successSearchProducts}
          </Link>
        </nav>
      </main>
      <PublicFooter
        companyName={homeCopy.companyName}
        configuration={shell.configuration}
        contactHeading={homeCopy.footerContact}
        demoNotice={homeCopy.demoNotice}
        description={homeCopy.footerDescription}
        exploreHeading={homeCopy.footerExplore}
        informationHeading={homeCopy.footerInformation}
        locale={locale}
        navigation={homeCopy.nav}
        privacyLabel={homeCopy.footerPrivacy}
        visibleNavigationAnchors={shell.visibleNavigationAnchors}
      />
    </div>
  );
}
