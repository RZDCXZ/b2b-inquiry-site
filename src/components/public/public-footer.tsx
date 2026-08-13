import Link from "next/link";

import type { PublicLocale } from "@/src/modules/site-config/public/locales";

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

export function PublicFooter({
  companyName,
  contactHeading,
  demoNotice,
  description,
  exploreHeading,
  informationHeading,
  locale,
  navigation,
  privacyLabel,
}: PublicFooterProps) {
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
                : `/${locale}#${item.anchor}`
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
        <a href="mailto:inquiries@torquelis.example">
          inquiries@torquelis.example
        </a>
        <span>+86 000 0000 0000</span>
      </section>
      <aside className="demo-boundary" id="demo-data">
        <span aria-hidden="true">i</span>
        <p>{demoNotice}</p>
      </aside>
    </footer>
  );
}
