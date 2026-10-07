import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Phone } from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/lib/constants";
import { ContentService } from "@/lib/services/content-service";
import { getBreadcrumbSchema, serializeJsonLd } from "@/lib/seo/jsonld-schemas";

export const metadata: Metadata = {
  title: "Terms of Service & Guarantees — Laundry Express",
  description:
    "Review our Zero Lost-Garment Guarantee, 100% Satisfaction Free Re-Wash Policy, and Happiness Guarantee. Transparent doorstep laundry terms.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Laundry Express — Terms of Service & Guarantees",
    description: "Official customer satisfaction guarantees, safe garment policies, and service terms.",
    url: `${APP_CONFIG.url}/terms`,
    siteName: "Laundry Express",
    images: [{ url: "/brand/logo-badge.jpeg", width: 1200, height: 630, alt: "Laundry Express Terms", type: "image/jpeg" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service & Guarantees — Laundry Express",
    description: "Official customer satisfaction guarantees, safe garment policies, and service terms.",
    images: ["/brand/logo-badge.jpeg"],
  },
};

export default async function TermsPage() {
  const terms = await ContentService.getTerms();
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Terms & Guarantees", path: "/terms" },
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16 space-y-10 sm:space-y-12">
        {/* Top Breadcrumb */}
        <div className="pb-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Intro Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-50 border border-pink-200 text-primary-dark text-xs font-black">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Official Customer Guarantees</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Terms of Service &amp; Guarantee Policies
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            Review the current service terms and guarantees published by Laundry Express.
          </p>
        </div>

        {/* Dynamic Guarantee Cards */}
        {terms.length > 0 ? (
          <div className="space-y-12 sm:space-y-16" id="guarantee-policy">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {terms.slice(0, 3).map((g) => (
                <div
                  key={g.id}
                  className="p-7 sm:p-8 rounded-3xl bg-pink-50/50 border border-pink-100 shadow-xs space-y-3.5 transition-all hover:shadow-md"
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary-dark bg-white px-3 py-1 rounded-full border border-pink-200 shadow-2xs">
                    {g.subtitle || "Guarantee"}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">{g.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">{g.description}</p>
                </div>
              ))}
            </div>

            <div className="space-y-8 sm:space-y-10 pt-2 text-slate-800">
              {terms.map((item, idx) => (
                <section key={item.id} className="p-7 sm:p-10 rounded-3xl bg-slate-50/40 border border-slate-200 shadow-2xs space-y-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-pink-100/70 text-primary">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">{idx + 1}. {item.title}</h2>
                  </div>
                  {item.subtitle && <p className="text-xs sm:text-sm font-bold text-primary pl-1">{item.subtitle}</p>}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line pl-1">{item.description}</p>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-12 sm:py-16 px-6 sm:px-12 rounded-3xl bg-slate-50/80 border border-slate-200/80 text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
              <ShieldCheck className="h-8 w-8 text-primary opacity-80" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Standard Service Commitments</h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Terms and guarantees will appear here when they are published by the operations team.
            </p>
          </div>
        )}

        {/* Contact Support Strip */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-pink-500 via-rose-500 to-rose-600 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">Questions About Our Terms or Guarantees?</h3>
            <p className="text-xs sm:text-sm text-pink-100 max-w-xl leading-relaxed">
              Contact our customer care team with questions about these terms.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 shrink-0">
            <a href={`tel:${APP_CONFIG.supportPhone}`}>
              <Button variant="outline" size="lg" className="bg-white text-slate-900 border-white hover:bg-pink-50 shadow-sm">
                <Phone className="h-4 w-4 mr-2 text-primary" />
                <span>{APP_CONFIG.supportPhone}</span>
              </Button>
            </a>
            <Link href="/order">
              <Button size="lg" className="bg-slate-900 hover:bg-black text-white shadow-md">
                Book a Pickup
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
