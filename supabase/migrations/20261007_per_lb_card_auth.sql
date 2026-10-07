-- Migration: Add card on file & Stripe customer tracking to orders for Per Pound post-weigh billing
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS card_brand TEXT,
ADD COLUMN IF NOT EXISTS card_last4 TEXT;

-- Index for looking up orders by Stripe customer / payment method
CREATE INDEX IF NOT EXISTS idx_orders_stripe_customer_id ON public.orders(stripe_customer_id);
