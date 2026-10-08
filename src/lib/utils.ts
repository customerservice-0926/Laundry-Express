import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind and conditional classes safely.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats numeric amount to USD currency string ($XX.XX).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a date string or Date object into human-friendly format.
 * e.g., "Mon, Oct 12, 2026"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Formats a date with time for order proof timestamps.
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Converts "HH:MM" 24-hour time to "H:MM AM/PM" 12-hour display.
 */
export function fmt12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Builds a human-readable slot label from admin-configured times.
 */
export function formatSlotLabel(
  slotId: "8am-12pm" | "1pm-6pm",
  slot1Start: string,
  slot1End: string,
  slot2Start: string,
  slot2End: string
): string {
  if (slotId === "8am-12pm") {
    return `${fmt12h(slot1Start)} – ${fmt12h(slot1End)}`;
  }
  return `${fmt12h(slot2Start)} – ${fmt12h(slot2End)}`;
}

/**
 * Generates human-friendly sequential order code (e.g. LX-2026-0042).
 */
export function generateOrderNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const padded = sequence.toString().padStart(4, "0");
  return `LX-${year}-${padded}`;
}

/**
 * Formats phone numbers cleanly to (XXX) XXX-XXXX.
 */
export function formatPhone(phone: string): string {
  const cleaned = ("" + phone).replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}

/**
 * Formats user input as US phone digits while typing: (XXX) XXX-XXXX
 */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Strips angle brackets and trims input to prevent XSS / markup injection.
 */
export function sanitizeText(text?: string | null): string {
  if (!text) return "";
  return text.replace(/[<>]/g, "").trim();
}

/**
 * Truncates long text gracefully.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Returns human-readable relative time (e.g., "10m ago", "2h ago").
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

/**
 * Resolves a catalog detergent ID to its human-readable brand name.
 */
export function resolveDetergentName(id?: string | null): string {
  if (!id) return "Standard Eco Detergent";
  const catalog: Record<string, string> = {
    "det-tide-pods": "Tide Original Power Pods",
    "det-eco-plant": "Seventh Generation Eco-Plant",
    "det-hypoallergenic": "All Free & Clear (Hypoallergenic)",
    "det-persil": "Persil ProClean Intense",
    "det-lavender": "Mrs. Meyer's Clean Day",
  };
  return (
    catalog[id] ||
    id.replace(/^det-/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
