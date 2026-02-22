import { supabase } from "@/lib/supabase";
import { isSupabaseConfigured, performActionViaApi } from "./db-utils";
import { Venue, Product } from "@/data/db";

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
            image: data.image,
            categoryId: data.category_id,
            venueId: data.venue_id,
            isAvailable: data.is_available,
            allergens: data.allergens,
            isChefRecommendation: data.is_chef_recommendation,
            labels: data.labels,
            currency: 'TRY',
            translations: typeof data.translations === 'string' ? JSON.parse(data.translations) : data.translations
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
        const dbUpdates: any = {};

        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.price !== undefined) dbUpdates.price = updates.price;
        if (updates.image !== undefined) dbUpdates.image = updates.image;
        if (updates.allergens !== undefined) dbUpdates.allergens = updates.allergens;

        // Mapped fields
        if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
        if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;
        if (updates.isChefRecommendation !== undefined) dbUpdates.is_chef_recommendation = updates.isChefRecommendation;
        if (updates.labels !== undefined) dbUpdates.labels = updates.labels;
        if (updates.translations !== undefined) dbUpdates.translations = updates.translations;

        if (Object.keys(dbUpdates).length === 0) return;

        try {
            await performActionViaApi('products', 'update', dbUpdates, id);
        } catch (err) {
            console.error("API Update failed, falling back to direct:", err);
            const { error } = await supabase.from('products').update(dbUpdates).eq('id', id);
            if (error) throw error;
        }
    },

    createProduct: async (product: any) => {
        if (!isSupabaseConfigured()) return;
        const dbProduct: any = { ...product };

        // Map keys
        if (product.isAvailable !== undefined) {
            dbProduct.is_available = product.isAvailable;
            delete dbProduct.isAvailable;
        }
        if (product.categoryId !== undefined) {
            dbProduct.category_id = product.categoryId;
            delete dbProduct.categoryId;
        }
        if (product.venueId !== undefined) {
            dbProduct.venue_id = product.venueId;
            delete dbProduct.venueId;
        }
        if (product.isChefRecommendation !== undefined) {
            dbProduct.is_chef_recommendation = product.isChefRecommendation;
            delete dbProduct.isChefRecommendation;
        }
        // Allergens and Labels don't change keys but ensuring they exist
        if (product.allergens === undefined) dbProduct.allergens = [];

        console.log("Creating product with payload:", dbProduct); // Debug log

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
                image: data.image,
                categoryId: data.category_id,
                venueId: data.venue_id,
                isAvailable: data.is_available,
                allergens: data.allergens,
                isChefRecommendation: data.is_chef_recommendation,
                labels: data.labels,
                currency: 'TRY'
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
                image: data.image,
                categoryId: data.category_id,
                venueId: data.venue_id,
                isAvailable: data.is_available,
                allergens: data.allergens,
                isChefRecommendation: data.is_chef_recommendation,
                labels: data.labels,
                currency: 'TRY'
            };
        }
    }
};
