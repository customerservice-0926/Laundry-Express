import type { PricingMode } from "@/types";

export interface CalculatePriceInput {
  pricing_mode: PricingMode;
  bag_count?: number;
  estimated_weight_lbs?: number;
  detergent_id?: string;
  detergent_fee?: number;
  promo?: {
    code: string;
    discount_type: "percentage" | "fixed_amount" | "free_delivery";
    discount_value: number;
  };
  base_bag_price: number;
  base_pound_price: number;
  min_bags: number;
  max_bags: number;
  min_lbs: number;
  max_lbs: number;
  free_delivery_lbs: number;
  one_bag_delivery_fee: number;
  free_delivery_threshold: number;
  package?: { price: number; capacity: number; unit_type: "bag" | "lb" };
}

export interface CalculatedPriceResult {
  pricing_mode: PricingMode;
  subtotal: number;
  detergent_fee: number;
  delivery_fee: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  breakdown: {
    unit_count: number;
    unit_name: string;
    unit_rate: number;
    promo_applied?: string;
  };
}

/**
 * Server-side zero-trust pricing engine.
 * Computes exact dollar and cent totals based on verified business rules and live admin rates.
 */
export function calculateOrderPrice(input: CalculatePriceInput): CalculatedPriceResult {
  let subtotal = 0;
  let deliveryFee = 0;
  let unitCount = 0;
  let unitName = "bags";

  const bagPrice = input.base_bag_price;
  const poundPrice = input.base_pound_price;
  const stdDeliveryFee = input.one_bag_delivery_fee;
  const freeBagThreshold = input.free_delivery_threshold;
  const freePoundThreshold = input.free_delivery_lbs;
  const minLbs = input.min_lbs;

  let unitRate: number = bagPrice;

  // 1. Base cost calculation by mode
  if (input.pricing_mode === "per_bag") {
    unitCount = Math.floor(input.bag_count || input.min_bags);
    if (unitCount < input.min_bags || unitCount > input.max_bags) {
      throw new Error(`Bag quantity must be between ${input.min_bags} and ${input.max_bags}.`);
    }
    unitName = "bags";
    unitRate = bagPrice;
    subtotal = Math.round(unitCount * unitRate * 100) / 100;
    // Free delivery rule for bags
    deliveryFee = unitCount >= freeBagThreshold ? 0 : stdDeliveryFee;
  } else if (input.pricing_mode === "per_lb") {
    const rawWeight = Number(input.estimated_weight_lbs ?? minLbs);
    if (rawWeight < minLbs || rawWeight > input.max_lbs) {
      throw new Error(`Laundry weight must be between ${minLbs} and ${input.max_lbs} lbs.`);
    }
    unitCount = rawWeight;
    unitName = "lbs";
    unitRate = poundPrice;
    subtotal = Math.round(unitCount * unitRate * 100) / 100;

    // Free delivery rule: weight >= freePoundThreshold = FREE ($0.00), otherwise stdDeliveryFee
    deliveryFee = unitCount >= freePoundThreshold ? 0 : stdDeliveryFee;
  } else if (input.pricing_mode === "package") {
    if (!input.package || input.package.price <= 0 || input.package.capacity <= 0) {
      throw new Error("Choose an available package.");
    }
    unitCount = input.package.capacity;
    unitName = input.package.unit_type === "lb" ? "lbs" : "bags";
    unitRate = Math.round((input.package.price / unitCount) * 100) / 100;
    subtotal = Math.round(input.package.price * 100) / 100;
    deliveryFee = 0;
  }

  // 2. Detergent add-on
  const detergentFee = Math.max(0, Number(input.detergent_fee || 0));

  // 3. Promotional discounts
  let discountAmount = 0;
  let promoApplied: string | undefined;

  if (input.promo) {
    const eligibleAmount = subtotal + detergentFee;
    if (input.promo.discount_type === "percentage") {
      discountAmount = Math.round(eligibleAmount * Math.min(100, input.promo.discount_value) / 100 * 100) / 100;
    } else if (input.promo.discount_type === "fixed_amount") {
      discountAmount = Math.min(eligibleAmount, Math.max(0, input.promo.discount_value));
    } else if (input.promo.discount_type === "free_delivery") {
      deliveryFee = 0;
    }
    promoApplied = input.promo.code;
  }

  const taxableAmount = Math.max(0, subtotal + detergentFee + deliveryFee - discountAmount);
  const taxAmount = 0; // Tax-exempt or bundled in base rate
  const totalAmount = Math.round(taxableAmount * 100) / 100;

  return {
    pricing_mode: input.pricing_mode,
    subtotal,
    detergent_fee: detergentFee,
    delivery_fee: deliveryFee,
    discount_amount: discountAmount,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    breakdown: {
      unit_count: unitCount,
      unit_name: unitName,
      unit_rate: unitRate,
      promo_applied: promoApplied,
    },
  };
}
