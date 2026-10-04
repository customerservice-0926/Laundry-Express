import { APP_CONFIG } from "@/lib/constants";
import type { PricingConfig } from "@/lib/services/pricing-plan-service";
import type { BusinessSettings, FaqItem } from "@/lib/services/content-service";

/**
 * Generates Schema.org JSON-LD for Laundry Express (LocalBusiness / DryCleaningOrLaundryService).
 */
export function getLocalBusinessSchema(pricing?: PricingConfig | null, settings?: BusinessSettings | null) {
  return {
    "@context": "https://schema.org",
    "@type": "DryCleaningOrLaundryService",
    name: APP_CONFIG.name,
    description: APP_CONFIG.description,
    url: APP_CONFIG.url,
    telephone: APP_CONFIG.supportPhone,
    email: APP_CONFIG.supportEmail,
    sameAs: [APP_CONFIG.facebookUrl],
    priceRange: "$$",
    paymentAccepted: "Credit Card, Apple Pay, Google Pay",
    currenciesAccepted: "USD",
    openingHours: settings?.operating_hours || undefined,
    areaServed: settings?.delivery_zones?.map((name) => ({ "@type": "Place", name })) || undefined,
    makesOffer: pricing ? [
      {
        "@type": "Offer",
        name: "13-Gallon Bag Wash & Fold",
        price: pricing.bag_price,
        priceCurrency: "USD",
      },
      {
        "@type": "Offer",
        name: "Per-Pound Laundry Service",
        price: pricing.pound_price,
        priceCurrency: "USD",
      },
    ] : undefined,
  };
}

/**
 * Generates FAQ Schema for common customer questions.
 */
export function getFaqSchema(faqs: FaqItem[] = []) {
  if (!faqs || faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * Safely serializes JSON-LD objects for HTML script tags.
 * Escapes '<', '>', and '&' to unicode escape sequences to prevent script breakout / injection.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
