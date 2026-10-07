import type { Metadata } from "next";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav";
import { PlanSelector } from "@/components/pricing/plan-selector";
import { PlanComparison } from "@/components/pricing/plan-comparison";
import { FaqSection } from "@/components/shared/faq-section";
import { APP_CONFIG } from "@/lib/constants";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Plans & Pricing — Transparent Laundry Rates",
  description:
    "View current doorstep laundry rates, weight-based wash and fold services, and saver packages in Lake in the Hills, IL, USA.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Laundry Express — Plans & Pricing | Lake in the Hills, IL",
    description:
      "Compare transparent wash-and-fold pricing options, 13-gallon bags, and saver packages in Lake in the Hills, IL, USA.",
    url: `${APP_CONFIG.url}/pricing`,
    siteName: "Laundry Express",
    images: [{ url: "/brand/logo-badge.jpeg", width: 1200, height: 630, type: "image/jpeg", alt: "Laundry Express Pricing" }],
    locale: "en_US",
    type: "website",
  },
};

/**
 * PricingPage Component
 *
 * Dedicated plans and pricing breakdown page.
 * Displays standard 13-gallon bag options, weighed bulk laundry by the pound,
 * prepaid saver packages, and detailed plan comparison matrix.
 * Includes instant calculator and side-by-side plan comparisons.
 * Main navigation stays static as users scroll.
 */
import { PricingPlanService } from "@/lib/services/pricing-plan-service";
import { formatCurrency } from "@/lib/utils";
import { getBreadcrumbSchema, getServiceSchema, serializeJsonLd } from "@/lib/seo/jsonld-schemas";

export default async function PricingPage() {
  const pricing = await PricingPlanService.getPricing().catch(() => null);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Plans & Pricing", path: "/pricing" },
  ]);
  const serviceSchema = getServiceSchema();

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-clip pt-12 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(serviceSchema) }}
      />
      {/* Sticky Global Navigation Navbar */}
      <Navbar />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Header Title & Positioning */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200 uppercase tracking-wide">
              Zero Hidden Fees &amp; Transparent Rates
            </span>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Simple, Transparent Plans.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-rose-600">
                Zero Surprises.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              No hidden service surcharges or surprise fees. Choose between standard bags, weighed bulk by the pound, or pre-paid discount saver packages.
            </p>

            {/* Quick Guarantees Pill Strip */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {pricing ? `${formatCurrency(pricing.bag_price)} Flat 13-Gal Bag Rate` : "Current rates managed by Laundry Express"}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4 text-sky-600" />
                Photo Proof Confirmation
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 font-bold">
                <Zap className="h-4 w-4 text-amber-500" />
                24-Hour Fast Turnaround
              </span>
            </div>
          </div>

          {/* Interactive Plan Selector: Bags vs Pounds vs Packages */}
          {pricing ? (
            <>
              <PlanSelector initialRates={pricing} />
              <PlanComparison initialRates={pricing} />
            </>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-600">
              Current prices are being configured. Please check back shortly.
            </p>
          )}

          {/* Common Pricing Questions */}
          <FaqSection />
        </div>
      </main>

      {/* Semantic Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
