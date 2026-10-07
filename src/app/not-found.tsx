import Link from "next/link";
import Image from "next/image";
import { Home, ShoppingBag, Sparkles, Phone, Tag } from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/lib/constants";

export const metadata = {
  title: "404 — Page Not Found | Laundry Express",
  description: "The page you are looking for does not exist or has been moved.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 overflow-x-clip">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-200">
          {/* Mascot Brand Illustration */}
          <div className="relative mx-auto w-32 h-32 sm:w-40 sm:h-40 rounded-3xl overflow-hidden shadow-xl shadow-pink-500/10 border-4 border-white bg-white ring-8 ring-pink-100/50">
            <Image
              src="/brand/hero.jpeg"
              alt="Laundry Express Superhero Mascot"
              fill
              sizes="(max-width: 640px) 128px, 160px"
              priority
              className="object-cover"
            />
          </div>

          {/* Heading & Context */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100/80 text-primary text-xs font-black uppercase tracking-wider border border-pink-200">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Lost in the Wash • 404</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Page Washed Away!
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
              Looks like this page got separated like a missing sock in the rinse cycle.
              Let&apos;s get you back to fresh, folded laundry.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="hero" size="lg" className="w-full shadow-md">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>

            <Link href="/order" className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md shadow-sky-600/15">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Book Laundry Pickup
              </Button>
            </Link>

            <Link href="/pricing" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full bg-white hover:bg-slate-50 font-bold border-slate-200">
                <Tag className="h-4 w-4 mr-2" />
                View Plans
              </Button>
            </Link>
          </div>

          {/* Quick Concierge Help Notice */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs max-w-md mx-auto text-xs text-slate-500 space-y-1">
            <div className="flex items-center justify-center gap-2 font-bold text-slate-800">
              <Phone className="h-3.5 w-3.5 text-primary" />
              <span>Looking for an active order or concierge help?</span>
            </div>
            <p>
              Call our support team at{" "}
              <a href={`tel:${APP_CONFIG.supportPhone}`} className="font-bold text-primary hover:underline">
                {APP_CONFIG.supportPhone}
              </a>{" "}
              or{" "}
              <Link href="/contact" className="font-bold text-sky-600 hover:underline">
                Contact Customer Care
              </Link>.
            </p>
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
