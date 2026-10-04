import type { Metadata } from "next";
import { Navbar } from "@/components/shared/navbar";
import { HeroSection } from "@/components/shared/hero-section";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { FaqSection } from "@/components/shared/faq-section";
import { HomeCtaBanner } from "@/components/home/home-cta-banner";
import { Footer } from "@/components/shared/footer";
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav";
import { getLocalBusinessSchema, getFaqSchema, serializeJsonLd } from "@/lib/seo/jsonld-schemas";
import { APP_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(APP_CONFIG.url),
  title: "Laundry Express — Pick Up • Wash • Fold • Deliver | More Time For What Matters",
  description:
    "Professional doorstep laundry pickup, wash, fold, and delivery. View current plans, service areas, and pickup windows.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Laundry Express — Pick Up • Wash • Fold • Deliver",
    description: "Professional doorstep laundry pickup, wash, fold, and delivery. View available service plans.",
    url: APP_CONFIG.url,
    siteName: "Laundry Express",
    images: [{ url: "/brand/logo-badge.jpg", width: 1200, height: 630, alt: "Laundry Express Logo" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Laundry Express — Pick Up • Wash • Fold • Deliver",
    description: "Laundry pickup and delivery with clear service plans and convenient booking.",
    images: ["/brand/logo-badge.jpg"],
  },
};

import { PricingPlanService } from "@/lib/services/pricing-plan-service";
import { ContentService } from "@/lib/services/content-service";

export default async function HomePage() {
  const [pricing, settings, faqs] = await Promise.all([
    PricingPlanService.getPricing().catch(() => null),
    ContentService.getSettings().catch(() => null),
    ContentService.getFaqs().catch((error: unknown) => {
      console.error("Unable to load FAQs for homepage structured data:", error);
      return [];
    }),
  ]);
  const localBusinessJsonLd = getLocalBusinessSchema(pricing, settings);
  const faqJsonLd = getFaqSchema(faqs);

  /**
   * HomePage Shell
   * Clean, high-converting layout featuring superhero brand alignment,
   * static primary navigation bar, and structured schema microdata.
   * Merges services & 4-step process into single animated HowItWorksSection.
   */
  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-clip max-md:pb-20">
      {/* Schema.org Structured Microdata for SEO & AI / LLM Agents */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(localBusinessJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
        />
      )}

      {/* Sticky Main Navigation Bar */}
      <Navbar />

      {/* Main Content Sections — Streamlined & Useful */}
      <main className="flex-1">
        {/* Superhero Mascot & Core Proposition Hero */}
        <HeroSection initialBagPrice={pricing?.bag_price} />

        {/* Unified Interactive Services & Process Journey */}
        <div id="services">
          <div id="process">
            <HowItWorksSection />
          </div>
        </div>

        {/* Moderated Customer Reviews & Photos */}
        <div id="reviews">
          <ReviewsSection />
        </div>

        {/* Operational & Service FAQs */}
        <div id="faq">
          <FaqSection />
        </div>

        {/* High-Conversion Bottom Banner */}
        <HomeCtaBanner />
      </main>

      {/* Semantic SEO-Rich Pure Black Footer */}
      <Footer />

      {/* Native Mobile Bottom App Bar */}
      <MobileBottomNav />
    </div>
  );
}
