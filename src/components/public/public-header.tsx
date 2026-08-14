import Link from "next/link";

import { MobileNavigation } from "@/src/components/public/mobile-navigation";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

type PublicHeaderProps = {
  activeNavigationAnchor?: string;
  descriptor: string;
  languageHrefs?: Partial<Record<PublicLocale, string>>;
  languageLabel: string;
  locale: PublicLocale;
  mobileNavigationLabel: string;
  navigation: ReadonlyArray<{ label: string; anchor: string }>;
  primaryNavigationLabel: string;
  unavailableLanguages?: Partial<Record<PublicLocale, string>>;
};

const localeOptions = [
  { label: "EN", locale: "en" },
  { label: "简中", locale: "zh-cn" },
] as const;

export function PublicHeader({
  activeNavigationAnchor,
  descriptor,
  languageLabel,
  languageHrefs,
  locale,
  mobileNavigationLabel,
  navigation,
  primaryNavigationLabel,
  unavailableLanguages,
}: PublicHeaderProps) {
  const routeByAnchor: Record<string, string> = {
    about: "about",
    contact: "inquiry",
    "private-label": "private-label",
    quality: "quality",
    resources: "resources",
  };
  const items = navigation.map((item) => ({
    active: item.anchor === activeNavigationAnchor,
    label: item.label,
    href:
      item.anchor === "products"
        ? `/${locale}/products`
        : `/${locale}/${routeByAnchor[item.anchor] ?? ""}`,
  }));

  return (
    <header className="public-header">
      <Link aria-label="Torquelis home" className="brand" href={`/${locale}`}>
        <span>TORQUELIS</span>
        <small>{descriptor}</small>
      </Link>
      <nav aria-label={primaryNavigationLabel} className="desktop-navigation">
        {items.map((item) => (
          <Link
            aria-current={item.active ? "page" : undefined}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div aria-label={languageLabel} className="locale-switcher" role="group">
        {localeOptions.map((option) =>
          unavailableLanguages?.[option.locale] ? (
            <span aria-disabled="true" key={option.locale}>
              {option.label}
              <small>{unavailableLanguages[option.locale]}</small>
            </span>
          ) : (
            <Link
              aria-current={option.locale === locale ? "page" : undefined}
              href={languageHrefs?.[option.locale] ?? `/${option.locale}`}
              key={option.locale}
            >
              {option.label}
            </Link>
          ),
        )}
      </div>
      <MobileNavigation items={items} label={mobileNavigationLabel} />
    </header>
  );
}
