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

/**
 * Runs before the first paint: marks the page as animated (so content waiting
 * for its reveal is hidden from the start instead of flashing) unless the
 * visitor prefers reduced motion, and shows the intro once per tab session.
 */
const motionScript = `try{var d=document.documentElement;if(!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("js-motion");if(!sessionStorage.getItem("np-intro")){d.classList.add("intro");sessionStorage.setItem("np-intro","1")}}}catch(e){}`;

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html className={inter.variable} lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: motionScript}} />
      </head>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
