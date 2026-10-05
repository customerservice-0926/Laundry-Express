const PAYMENT_METHODS = ["card", "apple_pay", "stripe"];
const PICKUP_SLOTS = ["8am-12pm", "1pm-6pm"];

export function validateCheckoutPayload(input: unknown): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return "A JSON object is required.";
  }
  const body = input as Record<string, unknown>;
  if (body.pricing_mode !== "per_bag" && body.pricing_mode !== "per_lb" && body.pricing_mode !== "package") {
    return "Choose an available laundry pricing plan.";
  }
  if (body.pricing_mode === "package" && (typeof body.package_id !== "string" || !body.package_id)) {
    return "Choose an available package.";
  }
  if (
    typeof body.pickup_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.pickup_date) ||
    !Number.isFinite(Date.parse(`${body.pickup_date}T00:00:00Z`)) ||
    body.pickup_date < new Date().toISOString().slice(0, 10) ||
    typeof body.pickup_slot !== "string" ||
    !PICKUP_SLOTS.includes(body.pickup_slot) ||
    typeof body.street_address !== "string" || body.street_address.trim().length < 5 ||
    typeof body.city !== "string" || !body.city.trim() ||
    typeof body.state !== "string" || body.state.trim().toUpperCase() !== "IL" ||
    typeof body.zip_code !== "string" || !/^\d{5}(-\d{4})?$/.test(body.zip_code.trim()) ||
    typeof body.customer_phone !== "string" || body.customer_phone.trim().length < 7
  ) {
    return "Enter a valid pickup date, time, address, and phone number.";
  }
  if (body.delivery_date &&
    (typeof body.delivery_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.delivery_date) ||
      !Number.isFinite(Date.parse(`${body.delivery_date}T00:00:00Z`)) ||
      body.delivery_date < body.pickup_date)) {
    return "Choose a valid delivery date after pickup.";
  }
  if (body.promo_code !== undefined &&
    (typeof body.promo_code !== "string" || body.promo_code.length > 64)) {
    return "Enter a valid coupon code.";
  }
  if (typeof body.payment_method !== "string" || !PAYMENT_METHODS.includes(body.payment_method)) {
    return "Choose a supported payment method.";
  }
  return null;
}
