const DEFAULT_SITE_URL = "https://www.laundryexpressservices.com";
let siteUrl = DEFAULT_SITE_URL;
try {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    const parsed = new URL(raw);
    const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (process.env.NODE_ENV === "production" && (parsed.protocol !== "https:" || isLocal)) {
      siteUrl = DEFAULT_SITE_URL;
    } else {
      siteUrl = parsed.origin;
    }
  }
} catch {
  siteUrl = DEFAULT_SITE_URL;
}

export const APP_CONFIG = {
  name: "Laundry Express",
  tagline: "Pick Up • Wash • Fold • Deliver",
  subTagline: "More Time For What Matters",
  heroHeadline: "Laundry Piling Up?",
  description:
    "Professional doorstep laundry service with pickup, wash, fold, and delivery.",
  url: siteUrl,
  supportPhone: "815-575-9536",
  supportEmail: "customerservice@laundryexpressservices.com",
  facebookUrl: "https://www.facebook.com/profile.php?id=61594071297569",
  location: {
    city: "Lake in the Hills",
    state: "IL",
    country: "USA",
    formatted: "Lake in the Hills, IL, USA",
    mapsUrl: "https://maps.google.com/?q=Lake+in+the+Hills,+IL,+USA",
  },
  brandColors: {
    primary: "#EC4899", // Bubble Pink — main brand color
    primaryDark: "#BE185D", // Deep Rose — hover/pressed states
    primaryLight: "#F472B6",
    primaryPale: "#FCE7F3",
    primaryGhost: "rgba(236, 72, 153, 0.12)",
    secondary: "#38BDF8", // Bubble Sky Blue — cool accent
    accentAlert: "#D63A3A", // Cape Red — urgency states only
    deep: "#141B2E", // Ink Navy — body text & headings
    foamWhite: "#FFFFFF",
    heroAmber: "#F5A623",
  },
} as const;

export const ORDER_STATUSES = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-300" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800 border-blue-300" },
  driver_assigned: { label: "Driver Assigned", color: "bg-cyan-100 text-cyan-800 border-cyan-300" },
  picked_up: { label: "Picked Up", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  in_wash: { label: "In Wash", color: "bg-sky-100 text-sky-800 border-sky-300" },
  drying_folding: { label: "Drying/Folding", color: "bg-teal-100 text-teal-800 border-teal-300" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-purple-100 text-purple-800 border-purple-300" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  cancelled: { label: "Cancelled", color: "bg-rose-100 text-rose-800 border-rose-300" },
} as const;

export type OrderStatusKey = keyof typeof ORDER_STATUSES;



export const SITE_NAVIGATION_LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Plans & Bags" },
  { href: "/order", label: "Book Pickup" },
  { href: "/dashboard", label: "Dashboard" },
] as const;
