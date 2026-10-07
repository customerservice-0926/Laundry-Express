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
 * Generates BreadcrumbList Schema for structured navigation trails in Google SERP.
 */
export function getBreadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: crumb.name,
      item: crumb.path.startsWith("http") ? crumb.path : `${APP_CONFIG.url.replace(/\/$/, "")}${crumb.path}`,
    })),
  };
}

/**
 * Generates Service Schema for Laundry Express Wash & Fold services.
 */
export function getServiceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Wash & Fold Laundry Pickup Service",
    provider: {
      "@type": "DryCleaningOrLaundryService",
      name: APP_CONFIG.name,
      url: APP_CONFIG.url,
      telephone: APP_CONFIG.supportPhone,
    },
    areaServed: {
      "@type": "Place",
      name: "Lake in the Hills, IL & surrounding suburbs",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Laundry Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: "13-Gallon Bag Wash & Fold" },
        },
        {
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: "By-The-Pound Wash & Fold" },
        },
      ],
    },
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

