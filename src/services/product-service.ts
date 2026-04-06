import { supabase } from "@/lib/supabase";
import { isSupabaseConfigured, performActionViaApi } from "./db-utils";
import { Venue, Product } from "@/data/db";

const parsePriceVariants = (raw: unknown) => {
    if (!raw) return [];
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
        .filter(variant => variant && typeof variant === 'object')
        .map(variant => ({
            label: String((variant as { label?: unknown }).label || '').trim(),
            price: Number((variant as { price?: unknown }).price || 0)
        }))
        .filter(variant => variant.label && Number.isFinite(variant.price));
};

export const ProductService = {
    // Get single product mostly for audit logs
    getProductById: async (id: string): Promise<Product | null> => {
        if (!isSupabaseConfigured()) return null;

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            name: data.name,
            description: data.description,
            price: data.price,
            priceText: data.price_text || undefined,
            image: data.image,
            categoryId: data.category_id,
            venueId: data.venue_id,
            isAvailable: data.is_available,
            allergens: data.allergens,
            isChefRecommendation: data.is_chef_recommendation,
            labels: data.labels,
            currency: data.currency || 'TRY',
            pricingMode: data.pricing_mode || 'single',
            priceVariants: parsePriceVariants(data.price_variants),
            translations: typeof data.translations === 'string' ? JSON.parse(data.translations) : data.translations,
            startTime: data.start_time,
            endTime: data.end_time,
            discount_type: data.discount_type,
            discount_amount: data.discount_amount,
            orderIndex: typeof data.order_index === 'number' ? data.order_index : 0
        };
    },

    deleteProduct: async (id: string) => {
        if (!isSupabaseConfigured()) return;
        try {
            await performActionViaApi('products', 'delete', null, id);
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    updateProduct: async (id: string, updates: Partial<Venue['products'][0]>) => {
        if (!isSupabaseConfigured()) return;

        // Strict allowlist mapping to prevent sending unknown columns
        const dbUpdates: Record<string, unknown> = {};

        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.price !== undefined) dbUpdates.price = updates.price;
        if (updates.priceText !== undefined) dbUpdates.price_text = updates.priceText;
        if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
        if (updates.image !== undefined) dbUpdates.image = updates.image;
        if (updates.allergens !== undefined) dbUpdates.allergens = updates.allergens;
        if (updates.pricingMode !== undefined) dbUpdates.pricing_mode = updates.pricingMode;
        if (updates.priceVariants !== undefined) dbUpdates.price_variants = updates.priceVariants;

        // Mapped fields
        if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
        if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;
        if (updates.isChefRecommendation !== undefined) dbUpdates.is_chef_recommendation = updates.isChefRecommendation;
        if (updates.labels !== undefined) dbUpdates.labels = updates.labels;
        if (updates.translations !== undefined) dbUpdates.translations = updates.translations;

        // Time management
        if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime || null;
        if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime || null;

        // Discounts
        if (updates.discount_type !== undefined) dbUpdates.discount_type = updates.discount_type;
        if (updates.discount_amount !== undefined) dbUpdates.discount_amount = updates.discount_amount;
        if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex;

        if (Object.keys(dbUpdates).length === 0) return;

        try {
            await performActionViaApi('products', 'update', dbUpdates, id);
        } catch (err) {
            console.error("API Update failed, falling back to direct:", err);
            const { error } = await supabase.from('products').update(dbUpdates).eq('id', id);
            if (error) throw error;
        }
    },

    createProduct: async (product: Record<string, unknown>) => {
        if (!isSupabaseConfigured()) return;
        const dbProduct: Record<string, unknown> = {};

        if (product.name !== undefined) dbProduct.name = product.name;
        if (product.description !== undefined) dbProduct.description = product.description;
        if (product.price !== undefined) dbProduct.price = product.price;
        if (product.priceText !== undefined) dbProduct.price_text = product.priceText;
        if (product.currency !== undefined) dbProduct.currency = product.currency;
        if (product.image !== undefined) dbProduct.image = product.image;
        if (product.labels !== undefined) dbProduct.labels = product.labels;
        if (product.translations !== undefined) dbProduct.translations = product.translations;
        if (product.pricingMode !== undefined) dbProduct.pricing_mode = product.pricingMode;
        if (product.priceVariants !== undefined) dbProduct.price_variants = product.priceVariants;

        dbProduct.category_id = product.categoryId;
        dbProduct.venue_id = product.venueId;
        dbProduct.is_available = product.isAvailable !== undefined ? product.isAvailable : true;
        dbProduct.is_chef_recommendation = product.isChefRecommendation !== undefined ? product.isChefRecommendation : false;
        dbProduct.start_time = product.startTime !== undefined ? product.startTime : null;
        dbProduct.end_time = product.endTime !== undefined ? product.endTime : null;
        dbProduct.discount_type = product.discount_type !== undefined ? product.discount_type : null;
        dbProduct.discount_amount = product.discount_amount !== undefined ? product.discount_amount : null;
        dbProduct.allergens = product.allergens !== undefined ? product.allergens : [];
        dbProduct.currency = product.currency !== undefined ? product.currency : 'TRY';
        dbProduct.order_index = product.orderIndex !== undefined ? product.orderIndex : 0;

        // Use API to bypass RLS for Create
        try {
            const result = await performActionViaApi('products', 'create', dbProduct);
            const data = result && result.length > 0 ? result[0] : null;
            if (!data) throw new Error("Insert returned no data");

            // Map back to camelCase for frontend use
            return {
                id: data.id,
                name: data.name,
                description: data.description,
                price: data.price,
                priceText: data.price_text || undefined,
                image: data.image,
                categoryId: data.category_id,
                venueId: data.venue_id,
                isAvailable: data.is_available,
                allergens: data.allergens,
                isChefRecommendation: data.is_chef_recommendation,
                labels: data.labels,
                currency: data.currency || 'TRY',
                pricingMode: data.pricing_mode || 'single',
                priceVariants: parsePriceVariants(data.price_variants),
                translations: data.translations,
                startTime: data.start_time,
                endTime: data.end_time,
                discount_type: data.discount_type,
                discount_amount: data.discount_amount,
                orderIndex: typeof data.order_index === 'number' ? data.order_index : 0
            };
        } catch (e) {
            console.error("API Create Product failed:", e);
            // Direct Fallback? Only if RLS allows...
            const { data, error } = await supabase.from('products').insert(dbProduct).select().single();
            if (error) throw error;
            return {
                id: data.id,
                name: data.name,
                description: data.description,
                price: data.price,
                priceText: data.price_text || undefined,
                image: data.image,
                categoryId: data.category_id,
                venueId: data.venue_id,
                isAvailable: data.is_available,
                allergens: data.allergens,
                isChefRecommendation: data.is_chef_recommendation,
                labels: data.labels,
                currency: data.currency || 'TRY',
                pricingMode: data.pricing_mode || 'single',
                priceVariants: parsePriceVariants(data.price_variants),
                translations: data.translations,
                startTime: data.start_time,
                endTime: data.end_time,
                orderIndex: typeof data.order_index === 'number' ? data.order_index : 0
            };
        }
    }
};
