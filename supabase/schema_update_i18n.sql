-- Add translations column to products and categories for i18n support
-- This allows storing multiple languages without breaking existing schema
-- Example content: { "en": { "name": "Soup", "description": "Hot soup" }, "de": { ... } }

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- Add supported_languages to venues to configure which languages are available per venue
-- Default is Turkish ('tr')
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS supported_languages TEXT[] DEFAULT ARRAY['tr'];

-- Add default_language to venues (fallback language)
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'tr';
