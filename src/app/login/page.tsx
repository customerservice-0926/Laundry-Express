import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/shared/footer";
import { LoginView } from "@/components/auth/login-view";
import { APP_CONFIG } from "@/lib/constants";
import { serializeJsonLd } from "@/lib/seo/jsonld-schemas";

export const metadata: Metadata = {
  title: "Sign In — Laundry Express Customer & Staff Portal",
  description:
    "Sign in to your Laundry Express account. Track your wash and fold orders, view driver photo proofs, manage laundry bag preferences, or access admin operations.",
  alternates: {
    canonical: "/login",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Sign In — Laundry Express",
    description: "Access your customer orders or administrative operations portal.",
    url: `${APP_CONFIG.url}/login`,
    siteName: "Laundry Express",
    images: [
      {
        url: "/brand/logo-badge.jpeg",
        width: 1200,
        height: 630,
        alt: "Laundry Express Sign In",
        type: "image/jpeg",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

/**
 * Skeleton fallback shown while NextAuth and URL search params resolve
 */
function LoginLoadingSkeleton() {
  return (
    <div className="max-w-md mx-auto py-8 px-4 animate-pulse space-y-6">
      <div className="h-16 w-16 bg-slate-200 rounded-2xl mx-auto" />
      <div className="space-y-2 text-center">
        <div className="h-6 bg-slate-200 rounded-lg w-40 mx-auto" />
        <div className="h-4 bg-slate-100 rounded-lg w-64 mx-auto" />
      </div>
      <div className="h-11 bg-slate-100 rounded-xl border border-slate-200" />
      <div className="h-40 bg-slate-50 rounded-2xl border border-slate-100" />
    </div>
  );
}

/**
 * Structured SEO metadata script for Googlebot and LLMs
 */
function LoginStructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Laundry Express Authentication Portal",
    url: `${APP_CONFIG.url}/login`,
    description: "Secure customer and administrator sign in portal for Laundry Express.",
    isPartOf: {
      "@type": "WebSite",
      name: "Laundry Express",
      url: APP_CONFIG.url,
    },
    potentialAction: {
      "@type": "LoginAction",
      target: `${APP_CONFIG.url}/login`,
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
 * LoginPage Component
 *
 * Dedicated, simple authentication page for Laundry Express:
 * - Simple, focused layout with brand logo
 * - No redundant navigation or distracting cards
 * - NextAuth.js custom credentials and Google OAuth
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 overflow-x-clip">
      {/* High-level SEO structured data */}
      <LoginStructuredData />

      {/* Main Form Work Area */}
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

          {/* Interactive Login View with Suspense for SearchParams */}
          <React.Suspense fallback={<LoginLoadingSkeleton />}>
            <LoginView />
          </React.Suspense>
        </div>
      </main>

      {/* Semantic Footer */}
      <Footer />
    </div>
  );
}
