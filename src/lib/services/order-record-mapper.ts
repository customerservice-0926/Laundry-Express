import type { Order, OrderStatus } from "@/types";

type OrderRecord = Record<string, unknown>;

export function mapOrderRecord(item: OrderRecord): Order {
  const address = item.pickup_address;
  let addressObj: Record<string, unknown> = {};
  if (typeof address === "object" && address !== null) {
    addressObj = address as Record<string, unknown>;
  } else if (typeof address === "string" && address.trim().startsWith("{")) {
    try { addressObj = JSON.parse(address) as Record<string, unknown>; } catch { addressObj = {}; }
  }
  const pickupAddress = typeof address === "string" && !address.trim().startsWith("{")
    ? address
    : [
        item.street_address || addressObj.street_address,
        (item.apt_unit || addressObj.apt_unit) ? `Apt ${item.apt_unit || addressObj.apt_unit}` : "",
        item.city || addressObj.city,
        item.state || addressObj.state,
        item.zip_code || addressObj.zip_code,
      ].filter(Boolean).join(", ");

  const proofs = Array.isArray(item.proofs) ? item.proofs : [];
  let rawAddl = item.additional_items;
  if (typeof rawAddl === "string" && rawAddl.trim().startsWith("[")) {
    try { rawAddl = JSON.parse(rawAddl); } catch { rawAddl = []; }
  }
  const addlItems = (Array.isArray(rawAddl) && rawAddl.length > 0)
    ? rawAddl
    : (Array.isArray(addressObj.additional_items) ? addressObj.additional_items : []);

  const isInitialPaid = Boolean(
    item.tip_paid === true ||
    item.delivery_fee_paid === true ||
    addressObj.tip_paid === true ||
    addressObj.delivery_fee_paid === true ||
    addressObj.initial_paid === true ||
    item.payment_status === "paid" ||
    (item.payment_status === "authorized" && Boolean(item.stripe_payment_intent_id))
  );

  const tipPaid = (item.tip_paid != null)
    ? Boolean(item.tip_paid)
    : (addressObj.tip_paid != null ? Boolean(addressObj.tip_paid) : isInitialPaid);

  const deliveryPaid = (item.delivery_fee_paid != null)
    ? Boolean(item.delivery_fee_paid)
    : (addressObj.delivery_fee_paid != null ? Boolean(addressObj.delivery_fee_paid) : isInitialPaid);

  return {
    ...item,
    id: String(item.id),
    order_number: String(item.order_number),
    user_id: String(item.user_id || ""),
    pricing_mode: item.plan_type === "per_lb" ? "per_lb" : item.plan_type === "package" ? "package" : "per_bag",
    package_id: item.package_id ? String(item.package_id) : undefined,
    package_name: item.package_name ? String(item.package_name) : undefined,
    bag_count: Number(item.bag_count ?? 0),
    estimated_weight_lbs: Number(item.estimated_weight_lbs ?? item.weight_lbs ?? 0),
    final_weight_lbs: item.final_weight_lbs == null ? null : Number(item.final_weight_lbs),
    pickup_date: String(item.pickup_date),
    pickup_slot: String(item.pickup_time_slot || "8am-12pm") as Order["pickup_slot"],
    delivery_date: item.dropoff_date ? String(item.dropoff_date) : null,
    subtotal: Number(item.subtotal ?? 0),
    detergent_id: String(item.detergent_id || ""),
    detergent_name: item.detergent_name ? String(item.detergent_name) : undefined,
    detergent_fee: Number(item.detergent_fee ?? 0),
    additional_items: addlItems as Order["additional_items"],
    additional_items_fee: Number(item.additional_items_fee ?? addressObj.additional_items_fee ?? 0),
    tip_amount: Number(item.tip_amount ?? addressObj.tip_amount ?? 0),
    tip_paid: tipPaid,
    distance_miles: Number(item.distance_miles ?? addressObj.distance_miles ?? 0),
    distance_surcharge: Number(item.distance_surcharge ?? addressObj.distance_surcharge ?? 0),
    card_setup_link: item.card_setup_link ? String(item.card_setup_link) : (addressObj.card_setup_link ? String(addressObj.card_setup_link) : undefined),
    discount_amount: Number(item.discount_amount ?? 0),
    delivery_fee: Number(item.delivery_fee ?? 0),
    delivery_fee_paid: deliveryPaid,
    tax_amount: Number(item.tax_amount ?? 0),
    total_amount: Number(item.total_amount ?? 0),
    is_out_of_home: item.is_home_for_pickup === false,
    bag_outside_door_confirmed: Boolean(item.doorstep_confirmation),
    customer_name: String(item.customer_name || ""),
    customer_email: String(item.customer_email || ""),
    customer_phone: String(item.customer_phone || ""),
    pickup_address: pickupAddress,
    street_address: String(item.street_address || ""),
    apt_unit: String(item.apt_unit || ""),
    city: String(item.city || ""),
    state: String(item.state || ""),
    zip_code: String(item.zip_code || ""),
    customer_notes: String(item.special_instructions || ""),
    payment_method: String(item.payment_method || ""),
    payment_status: String(item.payment_status || "pending"),
    invoice_email_sent_at: item.invoice_email_sent_at ? String(item.invoice_email_sent_at) : null,
    order_status: String(item.order_status || "pending") as OrderStatus,
    stripe_customer_id: item.stripe_customer_id ? String(item.stripe_customer_id) : undefined,
    stripe_payment_method_id: item.stripe_payment_method_id ? String(item.stripe_payment_method_id) : undefined,
    card_brand: item.card_brand ? String(item.card_brand) : undefined,
    card_last4: item.card_last4 ? String(item.card_last4) : undefined,
    stripe_payment_intent: item.stripe_payment_intent_id ? String(item.stripe_payment_intent_id) : undefined,
    proofs: proofs.map((proof) => {
      const record = proof as OrderRecord;
      return {
        id: String(record.id),
        order_id: String(record.order_id),
        proof_type: record.proof_type === "pickup_doorstep" ? "pickup"
          : record.proof_type === "delivery_doorstep" ? "dropoff" : "damage",
        image_url: String(record.photo_url || ""),
        notes: record.notes ? String(record.notes) : undefined,
        uploaded_by: "operations-admin",
        created_at: String(record.created_at || ""),
      };
    }),
    created_at: String(item.created_at || ""),
    updated_at: String(item.updated_at || ""),
  } as Order;
}
