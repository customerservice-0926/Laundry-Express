-- Migration: Create public.stripe_webhook_events for durable Stripe webhook idempotency
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL DEFAULT 'unknown',
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
    lease_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
