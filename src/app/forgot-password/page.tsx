import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/shared/footer";
import { ForgotPasswordView } from "@/components/auth/forgot-password-view";
import { APP_CONFIG } from "@/lib/constants";
import { serializeJsonLd } from "@/lib/seo/jsonld-schemas";

export const metadata: Metadata = {
  title: "Forgot Password — Laundry Express",
  description:
    "Reset your Laundry Express customer or operations staff password with secure email verification.",
  alternates: {
    canonical: "/forgot-password",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Forgot Password — Laundry Express",
    description: "Account recovery and password reset.",
    url: `${APP_CONFIG.url}/forgot-password`,
    siteName: "Laundry Express",
    images: [
      {
        url: "/brand/logo-badge.jpeg",
        width: 1200,
        height: 630,
        alt: "Laundry Express Password Reset",
        type: "image/jpeg",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

/**
 * Skeleton fallback shown while forgot-password component mounts
 */
function ForgotPasswordSkeleton() {
  return (
    <div className="max-w-md mx-auto py-8 px-4 animate-pulse space-y-6">
      <div className="h-16 w-16 bg-slate-200 rounded-2xl mx-auto" />
      <div className="space-y-2 text-center">
        <div className="h-6 bg-slate-200 rounded-lg w-48 mx-auto" />
        <div className="h-4 bg-slate-100 rounded-lg w-64 mx-auto" />
      </div>
      <div className="h-11 bg-slate-100 rounded-xl border border-slate-200" />
      <div className="h-11 bg-slate-200 rounded-xl" />
    </div>
  );
}

/**
 * Structured SEO metadata for account recovery
 */
function ForgotPasswordStructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Laundry Express Password Recovery",
    url: `${APP_CONFIG.url}/forgot-password`,
    description: "Password reset and account recovery for Laundry Express.",
    isPartOf: {
      "@type": "WebSite",
      name: "Laundry Express",
      url: APP_CONFIG.url,
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
 * ForgotPasswordPage Component
 *
 * Dedicated simple password recovery page for customer and staff accounts:
 * - Simple layout matching /login and /register
 * - Dispatches recovery instructions
 */
export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 overflow-x-clip">
      {/* High-level SEO structured data */}
      <ForgotPasswordStructuredData />

      {/* Main Form Work Area */}
      <main className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Breadcrumb Header */}
          <div className="flex items-center justify-between">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>

          {/* Interactive Forgot Password View in Suspense Boundary */}
          <React.Suspense fallback={<ForgotPasswordSkeleton />}>
            <ForgotPasswordView />
          </React.Suspense>
        </div>
      </main>

      {/* Semantic Footer */}
      <Footer />
    </div>
  );
}
