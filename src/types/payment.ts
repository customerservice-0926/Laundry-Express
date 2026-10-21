export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded"
  | "partially_refunded";

export interface PaymentRecord {
  id: string;
  payment_number: string;
  order_id: string;
  user_id: string;
  provider: "stripe" | "package_credit";
  provider_payment_id?: string;
  amount: number;
  currency: string;
  payment_method_type: string;
  status: PaymentStatus;
  receipt_url?: string;
  failure_reason?: string;
  refunded_amount: number;
  metadata?: Record<string, unknown>;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminPaymentTransaction {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  date: string;
  amount: number;
  method: string;
  card_last4: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  stripe_payment_intent: string;
}
