import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {title: "Next Path", description: "Career navigation for the next step."};
const inter = Inter({subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-inter", display: "swap"});

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="ru" className={inter.variable}><body className="flex min-h-screen flex-col">{children}</body></html>;
}
