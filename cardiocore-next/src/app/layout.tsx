import type { Metadata, Viewport } from "next";
import { Sora, Manrope } from "next/font/google";
import { AuthProvider } from "@/features/auth/context/auth-context";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2FAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#071C21" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "CardioCore — Know Your Normal",
  description:
    "CardioCore — personalised cardiovascular monitoring for patients and clinicians. Monitoring support, not a diagnostic device.",
  icons: {
    icon: "/assets/heart-q.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${sora.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[var(--bg)] text-[var(--hi)] antialiased transition-colors duration-200">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
