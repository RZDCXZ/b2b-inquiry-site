import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../globals.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: {
    default: "运营后台 | Torquelis",
    template: "%s | Torquelis 运营后台",
  },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html data-scroll-behavior="smooth" lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
