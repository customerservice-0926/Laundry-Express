/**
 * Delivery Zone & Radius Service (Deprecated / Standardized)
 * Distance is no longer estimated with fake coordinates.
 * Delivery fee is controlled exclusively by admin pricing configurations,
 * and delivery serviceability is checked strictly against admin configured delivery zones.
 */

export interface RadiusCalculationResult {
  distanceMiles: number;
  isFreeDelivery: boolean;
  freeRadiusMiles: number;
  excessMiles: number;
  surcharge: number;
  message: string;
}

export function calculateDeliveryRadius(): RadiusCalculationResult {
  return {
    distanceMiles: 0,
    isFreeDelivery: true,
    freeRadiusMiles: 0,
    excessMiles: 0,
    surcharge: 0,
    message: "Delivery fee is calculated based on active plan rules and delivery zone settings.",
  };
}
