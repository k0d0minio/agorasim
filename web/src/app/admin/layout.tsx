import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agorasim Admin",
  // The admin area is private: keep it out of every crawler's index.
  robots: { index: false, follow: false },
  // Installable PWA. The manifest lives outside /admin so the auth proxy never
  // gates it (manifest fetches are credential-less); start_url/scope point back
  // at /admin.
  manifest: "/admin-manifest.webmanifest",
  appleWebApp: { capable: true, title: "Agorasim Ops", statusBarStyle: "default" },
  icons: { apple: "/icons/admin-apple-touch-icon.png" },
};

export const viewport: Viewport = {
  // Matches --background in globals.css so the installed app chrome blends in.
  themeColor: "#fdfaf4",
  // Let the bottom toolbar extend under the iOS home indicator (safe-area).
  viewportFit: "cover",
};

/**
 * Root shell for the admin area. Deliberately monolingual and stripped of the
 * public site chrome — this sits outside `[locale]` and is gated by `proxy.ts`.
 * The per-page dashboard chrome (sidebar/topbar) lives in `AdminShell`, so the
 * login screen can opt out of it.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
