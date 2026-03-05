import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sports Betting PoC",
  description: "Decentralized sports prediction market",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
