"use client";

import Link from "next/link";
import { Phone, Mail, ExternalLink, ShieldCheck } from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";
import { MascotBadge } from "@/components/shared/mascot-badge";
import { FloatingBubbles } from "./floating-bubbles";
import { useSettings, useSlot1Label, useSlot2Label } from "@/hooks/use-settings";

export function Footer() {
  const settings = useSettings();
  const slot1 = useSlot1Label(settings);
  const slot2 = useSlot2Label(settings);

  return (
    <footer className="relative bg-black text-slate-300 border-t border-neutral-900 pt-16 overflow-hidden">
      <FloatingBubbles variant="footer" count={8} className="opacity-40" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-12 border-b border-neutral-800">
          {/* Brand & Mascot */}
          <div className="md:col-span-1 space-y-4">
            <MascotBadge size="sm" withSpeech speechText="Clean clothes delivered fast!" />
            <p className="text-xs text-neutral-400 leading-relaxed">
              Laundry Express is your reliable doorstep wash &amp; fold hero. Pickup in minutes, washed with premium care, and returned fresh to your doorstep.
            </p>
            <Link
              href="/terms#guarantee-policy"
              className="text-xs text-primary hover:text-primary-light font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>100% Satisfaction &amp; Clean Guarantee</span>
            </Link>
          </div>

          {/* Operating Windows — dynamic from admin settings */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase">
              Pickup &amp; Delivery Windows
            </h4>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <span className="font-bold text-white block">Morning Window</span>
                {slot1}
              </li>
              <li className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <span className="font-bold text-white block">Afternoon Window</span>
                {slot2}
              </li>
            </ul>
          </div>

          {/* Service Area & Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase">
              Service Areas
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Serving a 40-mile radius across Northern Illinois &amp; Chicago Northwest suburbs. Free delivery within 30 miles; $10 flat delivery for 30–40 miles.
            </p>
            <div className="pt-1 space-y-1.5 text-xs">
              <a
                href={`tel:${APP_CONFIG.supportPhone}`}
                className="text-white hover:text-primary font-semibold flex items-center gap-1.5 transition-all"
              >
                <Phone className="h-3.5 w-3.5 text-primary" />
                {APP_CONFIG.supportPhone}
              </a>
              <a
                href={`mailto:${APP_CONFIG.supportEmail}`}
                className="text-neutral-400 hover:text-primary font-medium flex items-center gap-1.5 truncate transition-all"
              >
                <Mail className="h-3.5 w-3.5 text-primary" />
                {APP_CONFIG.supportEmail}
              </a>
              <a
                href={APP_CONFIG.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-300 hover:text-primary font-semibold flex items-center gap-1.5 pt-0.5 transition-all"
              >
                <span className="h-3.5 w-3.5 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">f</span>
                Follow on Facebook
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Credits & Legal */}
        <div className="py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>&copy; {new Date().getFullYear()} Laundry Express. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <Link href="/pricing" className="hover:text-primary transition-colors">Plans &amp; Bags</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms &amp; Guarantees</Link>
            <Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link>
            <Link href="/#faq" className="hover:text-primary transition-colors">FAQ</Link>
          </div>
          <p className="text-[11px] text-neutral-500">
            Powered by{" "}
            <a
              href="https://strixdevs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-neutral-300 hover:text-primary underline underline-offset-2 transition-all hover:drop-shadow-[0_0_8px_var(--primary)]"
            >
              STRIX DEVS
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export const SiteFooter = Footer;
export default Footer;
