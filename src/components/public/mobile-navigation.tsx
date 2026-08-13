"use client";

import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";

type MobileNavigationProps = {
  items: ReadonlyArray<{ label: string; href: string }>;
  label: string;
};

export function MobileNavigation({ items, label }: MobileNavigationProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <div className="mobile-navigation">
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={label}
        className="mobile-menu-button"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? (
          <X aria-hidden="true" size={25} />
        ) : (
          <List aria-hidden="true" size={25} />
        )}
      </button>
      <nav
        className={open ? "mobile-menu mobile-menu--open" : "mobile-menu"}
        id={menuId}
      >
        {items.map((item) => (
          <Link href={item.href} key={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
