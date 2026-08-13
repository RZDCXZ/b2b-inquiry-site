import Link from "next/link";

import { MobileNavigation } from "@/src/components/public/mobile-navigation";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

type PublicHeaderProps = {
  descriptor: string;
  languageLabel: string;
  locale: PublicLocale;
  navigation: ReadonlyArray<{ label: string; anchor: string }>;
};

export function PublicHeader({
  descriptor,
  languageLabel,
  locale,
  navigation,
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
      <nav
        aria-label={locale === "en" ? "Primary navigation" : "主要导航"}
        className="desktop-navigation"
      >
        {items.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div aria-label={languageLabel} className="locale-switcher" role="group">
        <Link aria-current={locale === "en" ? "page" : undefined} href="/en">
          EN
        </Link>
        <Link
          aria-current={locale === "zh-cn" ? "page" : undefined}
          href="/zh-cn"
        >
          简中
        </Link>
      </div>
      <MobileNavigation
        items={items}
        label={locale === "en" ? "Toggle navigation" : "打开或关闭导航"}
      />
    </header>
  );
}
