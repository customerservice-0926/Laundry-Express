import type { Metadata } from "next";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav";
import { ContactView } from "@/components/contact/contact-view";
import { APP_CONFIG } from "@/lib/constants";
import { Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us & Operations Hub — Laundry Express",
  description:
    "Contact Laundry Express for customer support, service coverage, and pickup scheduling.",
  keywords: [
    "contact laundry express",
    "laundry express location",
    "customer support laundry",
    "doorstep laundry pickup",
  ],
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Laundry Express — Doorstep Laundry Heroes",
    description: "Customer support, service coverage, and pickup scheduling.",
    url: `${APP_CONFIG.url}/contact`,
    siteName: "Laundry Express",
    images: [{ url: "/brand/logo-badge.jpg", width: 1200, height: 630, alt: "Laundry Express Contact" }],
    locale: "en_US",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 overflow-x-clip pt-12 sm:pt-16">
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
