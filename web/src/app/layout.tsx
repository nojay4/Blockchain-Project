import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Navbar1 } from "@/components/ui/shadcnblocks-com-navbar1";

export const metadata: Metadata = {
  title: "CU SportsBetting",
  description: "Decentralized sports prediction market",
};

const themeScript = `(function(){var k='cu-sportsbetting-theme';var t=localStorage.getItem(k);document.documentElement.classList.toggle('dark',t!=='light');})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <Navbar1 />
        {children}
      </body>
    </html>
  );
}
