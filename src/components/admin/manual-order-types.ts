import type { PricingMode, OrderAdditionalItemSelection } from "@/types";

export type ManualOrderAdditionalItem = OrderAdditionalItemSelection;

export interface ManualOrderFormState {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  street_address: string;
  apt_unit: string;
  city: string;
  state: string;
  zip_code: string;
  pricing_mode: PricingMode;
  bag_count: number;
  estimated_weight_lbs: number;
  package_id?: string;
  package_name?: string;
  package_price?: number;
  additional_items: ManualOrderAdditionalItem[];
  detergent_id: string;
  pickup_date: string;
  pickup_slot: "8am-12pm" | "1pm-6pm";
  delivery_date: string;
  delivery_slot: "8am-12pm" | "1pm-6pm";
  payment_method: "card" | "cash";
  payment_status: "paid" | "pending";
  order_status: "pending" | "confirmed" | "completed";
  is_out_of_home: boolean;
  special_instructions: string;
  tip_amount: number;
  send_email_copy: boolean;
}

export type ManualOrderFieldChange = <K extends keyof ManualOrderFormState>(
  key: K,
  val: ManualOrderFormState[K]
) => void;
