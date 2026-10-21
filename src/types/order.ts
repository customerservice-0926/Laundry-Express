import type { UserProfile, Detergent, PricingMode } from "./index";
import type { PaymentRecord } from "./payment";
import type { OrderReview } from "./review";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "driver_assigned"
  | "picked_up"
  | "in_wash"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export interface OrderAdditionalItemSelection {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderProof {
  id: string;
  order_id: string;
  proof_type: "pickup" | "dropoff" | "damage";
  image_url: string;
  photo_url?: string;
  notes?: string;
  uploaded_by: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  pricing_mode: PricingMode;
  package_id?: string | null;
  package_name?: string | null;
  detergent_id: string;
  detergent_name?: string;
  bag_count: number;
  estimated_weight_lbs?: number | null;
  final_weight_lbs?: number | null;
  pickup_date: string;
  pickup_slot: "8am-12pm" | "1pm-6pm";
  delivery_date?: string | null;
  delivery_slot?: string | null;
  subtotal: number;
  detergent_fee?: number;
  additional_items?: OrderAdditionalItemSelection[];
  additional_items_fee?: number;
  tip_amount?: number;
  distance_miles?: number;
  distance_surcharge?: number;
  card_setup_link?: string | null;
  discount_amount: number;
  coupon_code?: string | null;
  promotion_id?: string | null;
  delivery_fee: number;
  delivery_fee_paid?: boolean;
  tip_paid?: boolean;
  tax_amount: number;
  total_amount: number;
  is_out_of_home: boolean;
  bag_outside_door_confirmed: boolean;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  pickup_address?: string;
  street_address?: string;
  apt_unit?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  customer_notes?: string;
  special_instructions?: string;
  admin_notes?: string;
  payment_method?: string;
  payment_status?: string;
  invoice_email_sent_at?: string | null;
  order_status: OrderStatus;
  stripe_customer_id?: string;
  stripe_payment_method_id?: string;
  card_brand?: string;
  card_last4?: string;
  stripe_payment_intent?: string;
  has_preexisting_damage?: boolean;
  damage_notes?: string;
  damage_photo_url?: string;
  customer_notified_damage?: boolean;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: UserProfile;
  detergent?: Detergent;
  proofs?: OrderProof[];
  payment?: PaymentRecord;
  review?: OrderReview;
}
