"use client";

import * as React from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { PricingMode, User, PricingConfig } from "@/types";
import type { CouponItem } from "@/lib/services/coupon-service";
import { calculateOrderPrice } from "@/lib/stripe/pricing-calc";
import { useDetergents } from "@/hooks/use-detergents";
import { usePackagePlans } from "@/hooks/use-package-plans";
import { WizardStepper } from "./wizard-stepper";
import { StepPricingMode } from "./step-pricing-mode";
import { StepBagCounter } from "./step-bag-counter";
import { StepSlotPicker } from "./step-slot-picker";
import { StepDetergent } from "./step-detergent";
import { StepOutOfHome, type AddressDetails } from "./step-out-of-home";
import { StepReview } from "./step-review";
import { StepPayment } from "./step-payment";
import { OrderSummaryCard } from "./order-summary-card";
import { Button } from "@/components/ui/button";
import { useBookingCheckout } from "./use-booking-checkout";
import { useBookingConfig } from "./use-booking-config";

export interface BookingWizardProps {
  initialMode?: PricingMode;
  initialBagCount?: number;
  initialWeightLbs?: number;
  initialPackageId?: string;
  initialPricing?: Partial<PricingConfig>;
  currentUser?: User | null;
}

const STEPS = ["Plan & Quantity", "Detergent", "Schedule", "Address", "Review", "Payment"];

export function BookingWizard({
  initialMode = "per_bag", initialBagCount = 2, initialWeightLbs, initialPackageId, initialPricing, currentUser = null,
}: BookingWizardProps) {
  const [step, setStep] = React.useState(1);
  const [requestedMode, setPricingMode] = React.useState<PricingMode>(initialMode);
  const [packageId, setPackageId] = React.useState(initialPackageId ?? "");
  const { plans: packagePlans, isLoading: isLoadingPackages } = usePackagePlans();
  const selectedPackage = packagePlans.find((p) => p.id === packageId) ?? packagePlans[0];
  const pricingMode: PricingMode = requestedMode === "package" && !selectedPackage ? "per_bag" : requestedMode;
  const [bagCount, setBagCount] = React.useState(initialBagCount);
  const [weightLbs, setWeightLbs] = React.useState(() => Number(initialWeightLbs ?? initialPricing?.min_lbs ?? 0));
  const [selectedDetergentId, setSelectedDetergentId] = React.useState("");
  const [showStep2Errors, setShowStep2Errors] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [dropoffDate, setDropoffDate] = React.useState("");
  const [selectedSlot, setSelectedSlot] = React.useState<"8am-12pm" | "1pm-6pm">("8am-12pm");
  const [isOutOfHome, setIsOutOfHome] = React.useState(false);
  const [isAwayForDropoff, setIsAwayForDropoff] = React.useState(false);
  const [bagConfirmed, setBagConfirmed] = React.useState(false);
  const [address, setAddress] = React.useState("");
  const [addressDetails, setAddressDetails] = React.useState<AddressDetails>();
  const [phone, setPhone] = React.useState<string | null>(null);
  const phoneValue = phone ?? currentUser?.phone ?? "";
  const [showStep4Errors, setShowStep4Errors] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [promoCode, setPromoCode] = React.useState("");
  const [appliedCoupon, setAppliedCoupon] = React.useState<CouponItem>();
  const [promoError, setPromoError] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<"card" | "apple_pay">("card");

  const { settings, rates, serverTime, isLoading: isConfigLoading, error: configError } = useBookingConfig(initialPricing);
  const { detergents, isLoading: isLoadingDetergents, error: detergentError } = useDetergents();
  const selectedDetergent = detergents.find((item) => item.id === selectedDetergentId);
  const { checkout, isProcessing, checkoutError } = useBookingCheckout();

  const boundedBagCount = rates.minBags > 0 && rates.maxBags >= rates.minBags ? Math.min(rates.maxBags, Math.max(rates.minBags, bagCount)) : bagCount;
  const boundedWeightLbs = rates.minLbs > 0 && rates.maxLbs >= rates.minLbs ? Math.min(rates.maxLbs, Math.max(rates.minLbs, weightLbs)) : weightLbs;
  const pricingIsValid = rates.bagPrice > 0 && rates.poundPrice > 0 && rates.minBags > 0 && rates.maxBags >= rates.minBags && rates.minLbs > 0 && rates.maxLbs >= rates.minLbs;

  const priceResult = React.useMemo(() => {
    if (isConfigLoading || configError || !pricingIsValid) return null;
    return calculateOrderPrice({
      pricing_mode: pricingMode, bag_count: boundedBagCount, estimated_weight_lbs: boundedWeightLbs,
      detergent_id: selectedDetergentId, detergent_fee: selectedDetergent?.price || 0,
      promo: appliedCoupon, base_bag_price: rates.bagPrice, base_pound_price: rates.poundPrice,
      min_bags: rates.minBags, max_bags: rates.maxBags, min_lbs: rates.minLbs, max_lbs: rates.maxLbs,
      free_delivery_lbs: rates.freeDeliveryLbs, one_bag_delivery_fee: rates.deliveryFee, free_delivery_threshold: rates.freeDeliveryBags,
      package: pricingMode === "package" && selectedPackage ? { price: selectedPackage.discounted_price, capacity: selectedPackage.capacity, unit_type: selectedPackage.unit_type } : undefined,
    });
  }, [isConfigLoading, configError, pricingIsValid, pricingMode, boundedBagCount, boundedWeightLbs, selectedDetergentId, selectedDetergent?.price, appliedCoupon, rates, selectedPackage]);

  const handleApplyPromo = async () => {
    if (!priceResult || !promoCode.trim()) return;
    try {
      const res = await fetch(`/api/coupons?code=${encodeURIComponent(promoCode.trim().toUpperCase())}&subtotal=${priceResult.subtotal}`);
      const data = await res.json();
      if (res.ok && data.valid) { setAppliedCoupon(data.coupon); setPromoError(""); }
      else setPromoError(data.error || "Invalid coupon code.");
    } catch { setPromoError("Failed to validate coupon."); }
  };

  const isStep1Valid = pricingMode === "package" ? Boolean(selectedPackage) : pricingMode === "per_lb" ? (boundedWeightLbs >= rates.minLbs && boundedWeightLbs <= rates.maxLbs && !isNaN(boundedWeightLbs)) : boundedBagCount >= rates.minBags && boundedBagCount <= rates.maxBags;
  const isStep2Valid = Boolean(selectedDetergentId);
  const todayStr = serverTime?.todayStr || new Date().toISOString().split("T")[0];
  const nowHour = serverTime?.currentHour ?? new Date().getHours();
  const isDateValid = Boolean(selectedDate && selectedDate >= todayStr);
  const isDropoffValid = !dropoffDate || dropoffDate >= selectedDate;

  const slot1EndHour = parseInt(settings.slot1End?.split(":")[0] || "12", 10);
  const slot2EndHour = parseInt(settings.slot2End?.split(":")[0] || "18", 10);
  const isSelectedSlotClosed = selectedDate === todayStr && (
    (selectedSlot === "8am-12pm" && nowHour >= slot1EndHour) ||
    (selectedSlot === "1pm-6pm" && nowHour >= slot2EndHour)
  );

  const isStep3Valid = isDateValid && isDropoffValid && Boolean(selectedSlot) && !isSelectedSlotClosed;
  const isAddressValid = address.trim().length >= 5 && Boolean(addressDetails?.city.trim()) && (addressDetails?.state.trim() || "IL") === "IL" && /^\d{5}(-\d{4})?$/.test(addressDetails?.zip.trim() || "");
  const isStep4Valid = Boolean(isAddressValid && phoneValue.trim().length >= 7 && (!isOutOfHome || bagConfirmed));

  const handleConfirm = () => {
    if (!priceResult) return;
    checkout({
      currentUser, pricingMode, packageId: selectedPackage?.id, bagCount: boundedBagCount, weightLbs: boundedWeightLbs, selectedDetergentId,
      selectedDate, selectedSlot, dropoffDate, address, phone: phoneValue, addressDetails, isOutOfHome,
      isAwayForDropoff, bagConfirmed, notes, priceResult, paymentMethod, coupon: appliedCoupon,
    });
  };

  return (
    <div id="book-now" className="scroll-mt-24 py-4 w-full max-w-full">
      {isConfigLoading || isLoadingPackages || configError || !priceResult ? (
        <div role={isConfigLoading || isLoadingPackages ? "status" : "alert"} className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
          {isConfigLoading || isLoadingPackages ? "Loading current service settings..." : configError || "Pricing is not configured correctly. Please contact Laundry Express."}
        </div>
      ) : (
      <>
        <WizardStepper steps={STEPS} currentStep={step} onStepClick={(target) => target < step && setStep(target)} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {checkoutError && <p role="alert" className="lg:col-span-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{checkoutError}</p>}
          <div className="lg:col-span-2 space-y-6">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <StepPricingMode selectedMode={pricingMode} onSelectMode={setPricingMode} bagPrice={rates.bagPrice} poundPrice={rates.poundPrice} minLbs={rates.minLbs} freeDeliveryBags={rates.freeDeliveryBags} freeDeliveryLbs={rates.freeDeliveryLbs} packageFromPrice={packagePlans.length ? Math.min(...packagePlans.map((p) => p.discounted_price)) : undefined} />
                <StepBagCounter pricingMode={pricingMode} bagCount={boundedBagCount} onBagCountChange={setBagCount} minBags={rates.minBags} maxBags={rates.maxBags} weightLbs={boundedWeightLbs} onWeightLbsChange={setWeightLbs} bagPrice={rates.bagPrice} freeDeliveryBags={rates.freeDeliveryBags} minLbs={rates.minLbs} maxLbs={rates.maxLbs} freeDeliveryLbs={rates.freeDeliveryLbs} packages={packagePlans} selectedPackageId={selectedPackage?.id} onSelectPackage={setPackageId} />
                <div className="flex justify-end pt-2">
                  <Button variant="hero" size="lg" disabled={!isStep1Valid} onClick={() => isStep1Valid && setStep(2)}>Continue to Detergent <ArrowRight className="h-4 w-4 ml-2" /></Button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <StepDetergent selectedDetergentId={selectedDetergentId} onSelectDetergent={(id) => { setSelectedDetergentId(id); setShowStep2Errors(false); }} showError={showStep2Errors} detergents={detergents} isLoading={isLoadingDetergents} loadError={detergentError} />
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    {!isStep2Valid && <span className="text-xs text-rose-500 font-semibold">Selection required</span>}
                    <Button variant="hero" size="lg" disabled={!isStep2Valid} onClick={() => { if (!isStep2Valid) { setShowStep2Errors(true); return; } setStep(3); }}>Continue to Schedule <ArrowRight className="h-4 w-4 ml-2" /></Button>
                  </div>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <StepSlotPicker
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                  dropoffDate={dropoffDate}
                  onSelectDropoffDate={setDropoffDate}
                  slot1Start={settings.slot1Start}
                  slot1End={settings.slot1End}
                  slot2Start={settings.slot2Start}
                  slot2End={settings.slot2End}
                  serverTime={serverTime}
                />
                {!isDropoffValid && <p className="text-xs text-rose-600 font-semibold px-1">Drop-off date cannot be before pickup date ({selectedDate}).</p>}
                {isSelectedSlotClosed && (
                  <p className="text-xs text-rose-600 font-semibold px-1">
                    The {selectedSlot} pickup window for today is closed. Please select an available window or future date to proceed.
                  </p>
                )}
                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                  <Button variant="hero" size="lg" disabled={!isStep3Valid} onClick={() => isStep3Valid && setStep(4)}>Continue to Address <ArrowRight className="h-4 w-4 ml-2" /></Button>
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <StepOutOfHome currentUser={currentUser} phone={phoneValue} onPhoneChange={(value) => setPhone(value)} isOutOfHome={isOutOfHome} onIsOutOfHomeChange={setIsOutOfHome} isAwayForDropoff={isAwayForDropoff} onIsAwayForDropoffChange={setIsAwayForDropoff} bagConfirmed={bagConfirmed} onBagConfirmedChange={setBagConfirmed} address={address} onAddressChange={setAddress} addressDetails={addressDetails} onAddressDetailsChange={setAddressDetails} notes={notes} onNotesChange={setNotes} deliveryZones={settings.deliveryZones} showValidationErrors={showStep4Errors} />
                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                  <Button variant="hero" size="lg" onClick={() => { if (!isStep4Valid) { setShowStep4Errors(true); return; } setStep(5); }}>Review Order <ArrowRight className="h-4 w-4 ml-2" /></Button>
                </div>
              </div>
            )}
            {step === 5 && (
              <StepReview pricingMode={pricingMode} bagCount={boundedBagCount} weightLbs={boundedWeightLbs} packageName={selectedPackage?.name} packageCapacity={selectedPackage?.capacity} packageUnit={selectedPackage?.unit_type} selectedDetergentId={selectedDetergentId} selectedDate={selectedDate} selectedSlot={selectedSlot} address={address} phone={phoneValue} isOutOfHome={isOutOfHome} slot1Start={settings.slot1Start} slot1End={settings.slot1End} slot2Start={settings.slot2Start} slot2End={settings.slot2End} onEditStep={setStep} onBack={() => setStep(4)} onContinue={() => setStep(6)} />
            )}
            {step === 6 && (
              <StepPayment priceResult={priceResult} promoCode={promoCode} onPromoCodeChange={setPromoCode} onApplyPromo={handleApplyPromo} promoError={promoError} paymentMethod={paymentMethod} onSelectPaymentMethod={setPaymentMethod} isProcessing={isProcessing} onConfirm={handleConfirm} onBack={() => setStep(5)} />
            )}
          </div>
          <div className="lg:col-span-1">
            <OrderSummaryCard pricingMode={pricingMode} bagCount={boundedBagCount} weightLbs={boundedWeightLbs} priceResult={priceResult} />
          </div>
        </div>
      </>
      )}
    </div>
  );
}
