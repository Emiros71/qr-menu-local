-- Pazarlama modülü eklentileri (Faz 14)
-- Ürünler için indirim altyapısı
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_type TEXT; -- 'percentage' veya 'fixed'
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_amount NUMERIC;

-- Mekanlar için kampanya popup altyapısı
ALTER TABLE venues ADD COLUMN IF NOT EXISTS popup_settings JSONB DEFAULT '{}'::jsonb;
