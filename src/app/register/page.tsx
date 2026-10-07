import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/shared/footer";
import { RegisterView } from "@/components/auth/register-view";
import { APP_CONFIG } from "@/lib/constants";
import { serializeJsonLd } from "@/lib/seo/jsonld-schemas";

export const metadata: Metadata = {
  title: "Create Customer Account — Laundry Express",
  description:
    "Register for Laundry Express. Get started with professional wash, fold, and doorstep pickup. Free delivery on 2 or more 13-gallon laundry bags.",
  alternates: {
    canonical: "/register",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Create Account — Laundry Express",
    description: "Register for doorstep laundry service with automated 24-hour return.",
    url: `${APP_CONFIG.url}/register`,
    siteName: "Laundry Express",
    images: [
      {
        url: "/brand/logo-badge.jpeg",
        width: 1200,
        height: 630,
        alt: "Laundry Express Registration",
        type: "image/jpeg",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

/**
 * Skeleton fallback shown while registration state and search params resolve
 */
function RegisterLoadingSkeleton() {
  return (
    <div className="max-w-md mx-auto py-8 px-4 animate-pulse space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="h-14 w-14 bg-slate-200 rounded-2xl shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-5 bg-slate-200 rounded-lg w-44" />
          <div className="h-3 bg-slate-100 rounded-lg w-56" />
        </div>
      </div>
      <div className="h-11 bg-slate-100 rounded-xl border border-slate-200" />
      <div className="space-y-3">
        <div className="h-10 bg-slate-100 rounded-xl" />
        <div className="h-10 bg-slate-100 rounded-xl" />
        <div className="h-10 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Structured SEO metadata for Googlebot and search crawlers
 */
function RegisterStructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Laundry Express Customer Registration",
    url: `${APP_CONFIG.url}/register`,
    description: "Create a customer account with Laundry Express for doorstep wash & fold service.",
    isPartOf: {
      "@type": "WebSite",
      name: "Laundry Express",
      url: APP_CONFIG.url,
    },
    potentialAction: {
      "@type": "RegisterAction",
      target: `${APP_CONFIG.url}/register`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
    />
  );
}

/**
 * RegisterPage Component
 *
 * Dedicated standalone customer registration page:
 * - Simple, focused layout with brand logo badge
 * - Independent page design separate from /login
 * - NextAuth custom registration and Google OAuth
 */
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 overflow-x-clip">
      {/* High-level SEO structured data */}
      <RegisterStructuredData />

      {/* Main Registration Work Area */}
      <main className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Back Navigation Breadcrumb */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>

          {/* Interactive Registration View with Suspense */}
          <React.Suspense fallback={<RegisterLoadingSkeleton />}>
            <RegisterView />
          </React.Suspense>
        </div>
      </main>

      {/* Semantic Footer */}
      <Footer />
    </div>
  );
}
