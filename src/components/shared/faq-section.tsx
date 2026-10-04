"use client";

import * as React from "react";
import { ChevronDown, HelpCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/constants";
import { useSettings, useSlot1Label, useSlot2Label } from "@/hooks/use-settings";

export function FaqSection() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);
  const [faqList, setFaqList] = React.useState<{ q: string; a: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const settings = useSettings();
  const slot1 = useSlot1Label(settings);
  const slot2 = useSlot2Label(settings);

  React.useEffect(() => {
    fetch("/api/content?type=faqs")
      .then((res) => res.json())
      .then((data) => {
        if (data.faqs && Array.isArray(data.faqs)) {
          setFaqList(data.faqs.map((f: { question: string; answer: string }) => ({ q: f.question, a: f.answer })));
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="faq" className="py-20 bg-slate-50/60 scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold mb-3">
            <HelpCircle className="h-3.5 w-3.5 text-sky-600" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Everything you need to know about our doorstep laundry service.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : faqList.length > 0 ? (
          <div className="space-y-3">
            {faqList.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-sky-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                        isOpen && "rotate-180 text-sky-600"
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100/80 mt-1">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 px-6 rounded-3xl bg-white border border-slate-200/80 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Have questions about pickups, delivery, or custom detergents?</p>
            <p className="text-xs text-slate-500">Our customer support team is available daily from {slot1} and {slot2}.</p>
            <a
              href={`tel:${APP_CONFIG.supportPhone}`}
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all"
            >
              <Phone className="h-4 w-4" />
              <span>Call Us: {APP_CONFIG.supportPhone}</span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
