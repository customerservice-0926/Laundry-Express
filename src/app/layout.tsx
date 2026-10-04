import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/auth-context";
import { APP_CONFIG } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: APP_CONFIG.brandColors.primary,
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_CONFIG.url),
  alternates: {
    canonical: "./",
  },
  title: {
    default: "Laundry Express | Pick Up • Wash • Fold • Deliver",
    template: "%s | Laundry Express",
  },
  description:
    "Laundry Express provides doorstep laundry pickup, wash-and-fold service, and delivery in Lake in the Hills, Illinois and nearby service areas. Review current plans and service coverage online.",
  keywords: [
    "laundry express",
    "doorstep laundry service",
    "wash and fold pickup",
    "free laundry delivery",
    "In 24h laundry delivery",
    "commercial laundry by pound",
  ],
  applicationName: "Laundry Express",
  authors: [{ name: "Laundry Express Team" }],
  creator: "STRIX DEVS",
  publisher: "Laundry Express Inc.",
  category: "Laundry service",
  formatDetection: {
    telephone: true,
    date: false,
    address: true,
    email: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Laundry Express",
  },
  icons: {
    icon: [
      { url: "/brand/mascot-bubble-hero.jpg", type: "image/jpeg" },
      { url: "/brand/mascot-bubble-hero.jpg", sizes: "any" },
    ],
    shortcut: "/brand/mascot-bubble-hero.jpg",
    apple: "/brand/mascot-bubble-hero.jpg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Laundry Express",
    title: "Laundry Express | Doorstep Laundry Pickup & Wash-and-Fold",
    description:
      "Review laundry pickup and wash-and-fold services, current plans, and delivery coverage in Lake in the Hills, Illinois.",
    images: [
      {
        url: "/brand/mascot-bubble-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Laundry Express Superhero Laundry",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Laundry Express | Doorstep Laundry Pickup & Wash-and-Fold",
    description:
      "Review laundry pickup and wash-and-fold services, current plans, and delivery coverage in Lake in the Hills, Illinois.",
    images: ["/brand/mascot-bubble-hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-sky-500 selection:text-white"
      >
        {/* Main Application Shell with Global Auth Provider */}
        <div className="flex-1 flex flex-col w-full overflow-x-clip">
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  );
}
