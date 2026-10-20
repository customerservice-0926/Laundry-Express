-- Migration: Admin operations, card setup, additional items, tips, and 30-mile radius

-- 1. Additional Items Catalog
CREATE TABLE IF NOT EXISTS public.additional_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'clothing',
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_additional_items_is_active 
ON public.additional_items(is_active);

-- Seed initial client-requested options
INSERT INTO public.additional_items (name, category, price, description, is_active)
VALUES
    ('Football Uniform', 'uniforms', 20.00, 'Specialty deep-stain wash, sanitized cycle & air-dry finish for football/sports uniforms.', TRUE),
    ('Shoe Cleaning', 'footwear', 15.00, 'Hand-detailed exterior & sole cleaning with deodorizing fabric treatment for athletic shoes.', TRUE),
    ('Heavy Blanket / Comforter', 'bedding', 18.00, 'Bulky blanket or down comforter wash, fluff dry, and dust-free packaging.', TRUE)
ON CONFLICT DO NOTHING;

-- 2. Orders Table Extensions (Tips, Distance Surcharge, Additional Items, Card Setup Link)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS additional_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS additional_items_fee NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS distance_miles NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS distance_surcharge NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS card_setup_link TEXT;

-- 3. System Settings 30-Mile radius parameters
UPDATE public.system_settings
SET value = value || jsonb_build_object(
    'free_radius_miles', 30,
    'extended_mile_rate', 1.50,
    'facility_address', 'Lake in the Hills, IL 60156',
    'facility_lat', 42.1817,
    'facility_lng', -88.3306
)
WHERE key = 'business_operations';
