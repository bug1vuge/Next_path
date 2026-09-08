import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";

/**
 * Absolute base for social images. Railway exposes the deployed host as
 * `RAILWAY_PUBLIC_DOMAIN`; `NEXT_PUBLIC_SITE_URL` overrides it on any other host.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {default: "Next Path", template: "%s · Next Path"},
  description: "Career navigation for the next step.",
  openGraph: {title: "Next Path", description: "Career navigation for the next step.", siteName: "Next Path", type: "website"}
};
const inter = Inter({subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-inter", display: "swap"});

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="ru" className={inter.variable}><body className="flex min-h-screen flex-col">{children}</body></html>;
}
