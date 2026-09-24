import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "YuYuTube",
  description: "Shaxsiy, tanlab olingan videolar.",
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: { capable: true, title: "YuYuTube", statusBarStyle: "black-translucent" },
  // Next emits the modern `mobile-web-app-capable`; older iPadOS still wants this one.
  other: { "apple-mobile-web-app-capable": "yes" },
  // Favicons and the iOS home-screen icon come from src/app/{favicon.ico,icon.svg,apple-icon.png}.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f0f0f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
