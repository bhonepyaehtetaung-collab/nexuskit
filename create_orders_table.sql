CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_amount NUMERIC(10, 2) NOT NULL,
    slip_image_url TEXT,
    status TEXT DEFAULT 'pending' NOT NULL,
    cart_items JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);