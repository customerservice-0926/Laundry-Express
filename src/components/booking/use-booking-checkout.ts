"use client";

import * as React from "react";
import type { AddressDetails } from "./step-out-of-home";
import type { PricingMode, User } from "@/types";
import type { CouponItem } from "@/lib/services/coupon-service";

export interface CheckoutPayload {
  currentUser: User | null;
  pricingMode: PricingMode;
  packageId?: string;
  bagCount: number;
  weightLbs?: number;
  selectedDetergentId: string;
  selectedDate: string;
  selectedSlot: string;
  dropoffDate: string;
  address: string;
  phone?: string;
  addressDetails?: AddressDetails;
  isOutOfHome: boolean;
  isAwayForDropoff: boolean;
  bagConfirmed: boolean;
  notes: string;
  priceResult: { subtotal: number; detergent_fee: number; delivery_fee: number; discount_amount: number; total_amount: number };
  coupon?: CouponItem;
  paymentMethod: "card" | "apple_pay";
}

export function useBookingCheckout() {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [checkoutError, setCheckoutError] = React.useState("");

  const checkout = async (p: CheckoutPayload) => {
    setIsProcessing(true);
    setCheckoutError("");
    const delivery = p.dropoffDate && p.dropoffDate.trim() ? p.dropoffDate.trim() : undefined;
    const weightAmount = p.weightLbs ?? 15;

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: p.currentUser?.full_name || p.currentUser?.name || "Customer",
          customer_email: p.currentUser?.email || "",
          customer_phone: p.phone || p.currentUser?.phone || "",
          pricing_mode: p.pricingMode,
          package_id: p.pricingMode === "package" ? p.packageId : undefined,
          bag_count: p.bagCount,
          estimated_weight_lbs: weightAmount,
          detergent_id: p.selectedDetergentId,
          promo_code: p.coupon?.code,
          pickup_date: p.selectedDate,
          pickup_slot: p.selectedSlot,
          delivery_date: delivery,
          street_address: p.addressDetails?.street || p.address,
          apt_unit: p.addressDetails?.apt || "",
          city: p.addressDetails?.city || "",
          state: p.addressDetails?.state || "",
          zip_code: p.addressDetails?.zip || "",
          is_out_of_home: p.isOutOfHome,
          is_away_for_dropoff: p.isAwayForDropoff,
          bag_outside_door_confirmed: p.bagConfirmed,
          special_instructions: p.notes,
          subtotal: p.priceResult.subtotal,
          delivery_fee: p.priceResult.delivery_fee,
          discount_amount: p.priceResult.discount_amount,
          total_amount: p.priceResult.total_amount,
          payment_method: p.paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        setCheckoutError(data?.error || "Unable to place your order. Please try again.");
        return;
      }

      // If Stripe returned a checkout session URL, redirect immediately
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (!data?.order) {
        setCheckoutError("The order could not be confirmed. Please contact support before retrying.");
        return;
      }

      window.location.assign(`/order/success?order_id=${encodeURIComponent(data.order.order_number)}`);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Unable to place your order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return { checkout, isProcessing, checkoutError };
}
