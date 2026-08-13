import Link from "next/link";

import { MobileNavigation } from "@/src/components/public/mobile-navigation";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

type PublicHeaderProps = {
  descriptor: string;
  languageLabel: string;
  locale: PublicLocale;
  mobileNavigationLabel: string;
  navigation: ReadonlyArray<{ label: string; anchor: string }>;
  primaryNavigationLabel: string;
};

const localeOptions = [
  { href: "/en", label: "EN", locale: "en" },
  { href: "/zh-cn", label: "简中", locale: "zh-cn" },
] as const;

export function PublicHeader({
  descriptor,
  languageLabel,
  locale,
  mobileNavigationLabel,
  navigation,
  primaryNavigationLabel,
}: PublicHeaderProps) {
  const items = navigation.map((item) => ({
    label: item.label,
    href: `/${locale}#${item.anchor}`,
  }));

  return (
    <header className="public-header">
      <Link aria-label="Torquelis home" className="brand" href={`/${locale}`}>
        <span>TORQUELIS</span>
        <small>{descriptor}</small>
      </Link>
      <nav aria-label={primaryNavigationLabel} className="desktop-navigation">
        {items.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div aria-label={languageLabel} className="locale-switcher" role="group">
        {localeOptions.map((option) => (
          <Link
            aria-current={option.locale === locale ? "page" : undefined}
            href={option.href}
            key={option.locale}
          >
            {option.label}
          </Link>
        ))}
      </div>
      <MobileNavigation items={items} label={mobileNavigationLabel} />
    </header>
  );
}
