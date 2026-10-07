import type { Metadata } from "next";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav";
import { ContactView } from "@/components/contact/contact-view";
import { APP_CONFIG } from "@/lib/constants";
import { Phone } from "lucide-react";
import { getBreadcrumbSchema, serializeJsonLd } from "@/lib/seo/jsonld-schemas";

export const metadata: Metadata = {
  title: "Contact Us & Operations Hub — Lake in the Hills, IL, USA",
  description:
    "Contact Laundry Express in Lake in the Hills, IL, USA for doorstep laundry customer support, service coverage, and pickup scheduling.",
  keywords: [
    "contact laundry express",
    "lake in the hills laundry service",
    "lake in the hills il usa laundry pickup",
    "customer support laundry",
    "doorstep laundry pickup",
  ],
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Laundry Express — Lake in the Hills, IL, USA",
    description: "Customer support, service coverage, and pickup scheduling in Lake in the Hills, IL, USA.",
    url: `${APP_CONFIG.url}/contact`,
    siteName: "Laundry Express",
    images: [{ url: "/brand/logo-badge.jpeg", width: 1200, height: 630, alt: "Laundry Express Contact", type: "image/jpeg" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Laundry Express — Lake in the Hills, IL, USA",
    description: "Customer support, service coverage, and pickup scheduling in Lake in the Hills, IL, USA.",
    images: ["/brand/logo-badge.jpeg"],
  },
};

export default function ContactPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 overflow-x-clip pt-12 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />
      {/* Sticky Global Navigation Navbar */}
      <Navbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Header Title & Hero Positioning */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-block px-3.5 py-1 rounded-full bg-pink-50 text-primary text-xs font-black border border-pink-200 uppercase tracking-wider shadow-xs">
              Laundry Express Customer Support
            </span>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Contact Our{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-primary to-rose-600">
                Laundry Superheroes
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Questions about service or an order? Contact our customer care team.
            </p>

            {/* Quick Contact Micro-Badges */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 font-semibold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-2xs">
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span>815-575-9536</span>
              </span>
            </div>
          </div>

          {/* Interactive 2-Column Contact Showcase (Left Details, Right Google Map) */}
          <ContactView />
        </div>
      </main>

      {/* Semantic Pure Black Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
