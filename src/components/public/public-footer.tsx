import Link from "next/link";

import type { PublicLocale } from "@/src/modules/site-config/public/locales";
import { getPublicSiteConfiguration } from "@/src/application/site-configuration";

type PublicFooterProps = {
  companyName: string;
  contactHeading: string;
  demoNotice: string;
  description: string;
  exploreHeading: string;
  informationHeading: string;
  locale: PublicLocale;
  navigation: ReadonlyArray<{ label: string; anchor: string }>;
  privacyLabel: string;
};

export async function PublicFooter({
  companyName: fallbackCompanyName,
  contactHeading,
  demoNotice,
  description,
  exploreHeading,
  informationHeading,
  locale,
  navigation,
  privacyLabel,
}: PublicFooterProps) {
  const settings = await getPublicSiteConfiguration();
  const configuredCompanyName =
    locale === "en"
      ? `${settings.companyNameEn} / ${settings.companyNameZhCn}`
      : `${settings.companyNameZhCn} / ${settings.companyNameEn}`;
  const companyName = configuredCompanyName.trim() || fallbackCompanyName;
  const address = locale === "en" ? settings.addressEn : settings.addressZhCn;
  return (
    <footer className="public-footer" id="contact">
      <section>
        <strong className="footer-brand">TORQUELIS</strong>
        <p>{companyName}</p>
        <p>{description}</p>
      </section>
      <section>
        <h2>{exploreHeading}</h2>
        {navigation.slice(0, 4).map((item) => (
          <Link
            href={
              item.anchor === "products"
                ? `/${locale}/products`
                : `/${locale}/${
                    {
                      "private-label": "private-label",
                      quality: "quality",
                      resources: "resources",
                    }[item.anchor] ?? ""
                  }`
            }
            key={item.anchor}
          >
            {item.label}
          </Link>
        ))}
      </section>
      <section>
        <h2>{informationHeading}</h2>
        <Link href={`/${locale}#demo-data`}>{privacyLabel}</Link>
        <h2 className="footer-contact-heading">{contactHeading}</h2>
        <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
        <a href={`tel:${settings.contactPhone.replace(/\s/gu, "")}`}>
          {settings.contactPhone}
        </a>
        <span>{address}</span>
        {Object.entries(settings.socialLinks).map(([label, href]) => (
          <a href={href} key={label} rel="noreferrer">
            {label}
          </a>
        ))}
      </section>
      <aside className="demo-boundary" id="demo-data">
        <span aria-hidden="true">i</span>
        <p>{demoNotice}</p>
      </aside>
    </footer>
  );
}
