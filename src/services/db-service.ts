import { supabase } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/client";
import { venues as mockVenues, Venue, Product, Category, Allergen } from "@/data/db";

// Helper to check if Supabase is configured
const isSupabaseConfigured = () => {
    return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

// Helper to perform generic actions via API (bypassing Client RLS)
async function performActionViaApi(table: string, action: 'update' | 'delete' | 'create', data: any, id?: string) {
    // Get Current User for Audit Log Context
    let userEmail = 'Anonim';
    try {
        const browserClient = createClient();
        const { data: { session } } = await browserClient.auth.getSession();
        if (session?.user?.email) userEmail = session.user.email;
    } catch (e) { console.error("Session check failed", e); }

    const payload: any = { table, action, updates: data, user_email: userEmail };
    if (id) payload.id = id;

    const response = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API ${action} failed for ${table}`);
    }
    const result = await response.json();
    return result.data; // Supabase returns array of affected rows
}

export const DbService = {
    // ... (Getters remain same)

    // Get all venues (for landing page / admin list)
    getVenues: async (): Promise<Venue[]> => {
        if (!isSupabaseConfigured()) {
            console.log("Supabase not configured, using mock data.");
            return mockVenues;
        }

        const { data, error } = await supabase.from('venues').select('*');
        if (error) {
            console.error("Error fetching venues:", error);
            return [];
        }

        // Transform Supabase structure to our Venue type if needed
        return data.map((v: any) => ({
            ...v,
            categories: [],
            products: []
        })) as Venue[];
    },

    // Get single venue by slug (for menu page)
    getVenueBySlug: async (slug: string): Promise<Venue | null> => {
        if (!isSupabaseConfigured()) {
            return mockVenues.find(v => v.slug === slug) || null;
        }

        // Fetch Venue
        const { data: venueData, error: venueError } = await supabase
            .from('venues')
            .select('*')
            .eq('slug', slug)
            .single();

        if (venueError || !venueData) return null;

        // Fetch Categories
        const { data: catData } = await supabase
            .from('categories')
            .select('*')
            .eq('venue_id', venueData.id)
            .order('order_index');

        // Fetch Products
        const { data: prodData } = await supabase
            .from('products')
            .select('*')
            .eq('venue_id', venueData.id)
            .eq('venue_id', venueData.id)
            .order('order_index');

        // Fetch Allergens (Global Library)
        const { data: allergenData } = await supabase
            .from('allergens')
            .select('*')
            .order('name');

        const products = (prodData || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            image: p.image,
            categoryId: p.category_id,
            venueId: p.venue_id,
            isAvailable: p.is_available,
            allergens: p.allergens,
            isChefRecommendation: p.is_chef_recommendation,
            labels: p.labels,
            currency: 'TRY',
            translations: typeof p.translations === 'string' ? JSON.parse(p.translations) : p.translations
        }));

        const categories = (catData || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            venueId: c.venue_id,
            translations: typeof c.translations === 'string' ? JSON.parse(c.translations) : c.translations
        }));

        const venue: Venue = {
            id: venueData.id,
            slug: venueData.slug,
            name: venueData.name,
            coverImage: venueData.cover_image || venueData.coverImage,
            theme: typeof venueData.theme === 'string' ? JSON.parse(venueData.theme) : venueData.theme,
            supportedLanguages: venueData.supported_languages,
            defaultLanguage: venueData.default_language,

            categories: categories,
            products: products,
            allergens: (allergenData || []).map((a: any) => ({
                id: a.id,
                name: a.name,
                translations: typeof a.translations === 'string' ? JSON.parse(a.translations) : a.translations
            }))
        };

        return venue;
    },

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

    // Get single venue by ID (for admin editor)
    getVenueById: async (id: string): Promise<Venue | null> => {
        if (!isSupabaseConfigured()) {
            return mockVenues.find(v => v.id === id) || null;
        }

        const { data: venueData, error: venueError } = await supabase
            .from('venues')
            .select('*')
            .eq('id', id)
            .single();

        if (venueError || !venueData) return null;

        const { data: catData } = await supabase
            .from('categories')
            .select('*')
            .eq('venue_id', venueData.id)
            .order('order_index');

        const { data: prodData } = await supabase
            .from('products')
            .select('*')
            .eq('venue_id', venueData.id)
            .order('order_index');

        const { data: allergenData } = await supabase
            .from('allergens')
            .select('*')
            .order('name');

        const products = (prodData || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            image: p.image,
            categoryId: p.category_id,
            venueId: p.venue_id,
            isAvailable: p.is_available,
            allergens: p.allergens,
            isChefRecommendation: p.is_chef_recommendation,
            labels: p.labels,
            currency: 'TRY',
            translations: p.translations
        }));

        const categories = (catData || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            venueId: c.venue_id,
            translations: c.translations
        }));

        const venue: Venue = {
            id: venueData.id,
            slug: venueData.slug,
            name: venueData.name,
            coverImage: venueData.cover_image || venueData.coverImage,
            theme: typeof venueData.theme === 'string' ? JSON.parse(venueData.theme) : venueData.theme,
            categories: categories,
            products: products,
            supportedLanguages: venueData.supported_languages,
            defaultLanguage: venueData.default_language,
            allergens: (allergenData || []).map((a: any) => ({
                id: a.id,
                name: a.name,
                translations: typeof a.translations === 'string' ? JSON.parse(a.translations) : a.translations
            }))
        };


        return venue;
    },

    updateVenue: async (id: string, updates: Partial<Venue>) => {
        if (!isSupabaseConfigured()) return;

        const dbUpdates: any = { ...updates };
        if (updates.coverImage !== undefined) {
            dbUpdates.cover_image = updates.coverImage;
            delete dbUpdates.coverImage;
        }
        if (updates.supportedLanguages !== undefined) {
            dbUpdates.supported_languages = updates.supportedLanguages;
            delete dbUpdates.supportedLanguages;
        }
        if (updates.defaultLanguage !== undefined) {
            dbUpdates.default_language = updates.defaultLanguage;
            delete dbUpdates.defaultLanguage;
        }

        // Use API to bypass RLS
        try {
            await performActionViaApi('venues', 'update', dbUpdates, id);
        } catch (e) {
            console.error(e);
            // Fallback
            const { error } = await supabase.from('venues').update(dbUpdates).eq('id', id);
            if (error) throw error;
        }
    },

    updateVenueTheme: async (id: string, theme: any) => {
        if (!isSupabaseConfigured()) return;

        // Use API to bypass RLS
        try {
            await performActionViaApi('venues', 'update', { theme }, id);
        } catch (e) {
            const { error } = await supabase.from('venues').update({ theme }).eq('id', id);
            if (error) throw error;
        }
    },

    updateCategory: async (id: string, updates: Partial<Category>) => {
        if (!isSupabaseConfigured()) return;

        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.translations !== undefined) dbUpdates.translations = updates.translations;

        if (Object.keys(dbUpdates).length === 0) return;

        try {
            await performActionViaApi('categories', 'update', dbUpdates, id);
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    deleteCategory: async (id: string) => {
        if (!isSupabaseConfigured()) return;
        try {
            // Note: Data is null for delete, but id is required
            await performActionViaApi('categories', 'delete', null, id);
        } catch (e) {
            console.error(e);
            throw e;
        }
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
    },

    createCategory: async (category: any) => {
        if (!isSupabaseConfigured()) return;

        const dbCategory: any = {
            venue_id: category.venueId,
            name: category.name,
            order_index: 0
        };

        if (category.translations) dbCategory.translations = category.translations;

        try {
            const result = await performActionViaApi('categories', 'create', dbCategory);
            const data = result && result.length > 0 ? result[0] : null;
            if (!data) throw new Error("Insert returned no data");

            return {
                id: data.id,
                name: data.name,
                venueId: data.venue_id,
                translations: data.translations
            };
        } catch (e) {
            console.error("API Create Category failed:", e);
            const { data, error } = await supabase.from('categories').insert(dbCategory).select().single();
            if (error) throw error;
            return {
                id: data.id,
                name: data.name,
                venueId: data.venue_id,
                translations: data.translations
            };
        }
    },

    // App Settings (Landing Page)
    getAppSettings: async (key: string = 'landing_page') => {

        if (!isSupabaseConfigured()) {
            return {
                backgroundImage: "/crowne_plaza_bg.jpg",
                title: "CROWNE PLAZA",
                subtitle: "ANKARA",
                instagramUrl: "https://instagram.com",
                websiteUrl: "https://crowneplaza.com"
            };
        }

        const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).single();
        if (error || !data) return null;
        return data.value;
    },

    updateAppSettings: async (key: string, value: any) => {
        if (!isSupabaseConfigured()) return;

        // Upsert via API for Audit Logging
        try {
            await performActionViaApi('app_settings', 'update', { value, updated_at: new Date().toISOString() }, key);
        } catch (e) {
            console.error("API Update Settings failed:", e);
            // Fallback
            const { error } = await supabase.from('app_settings').upsert({
                key,
                value,
                updated_at: new Date().toISOString()
            });
            if (error) throw error;
        }
    },

    // Allergens
    getAllergens: async (): Promise<Allergen[]> => {
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase.from('allergens').select('*').order('name');
        if (error) {
            console.error("Error fetching allergens:", error);
            return [];
        }
        return data.map((a: any) => ({
            id: a.id,
            name: a.name,
            translations: a.translations,
            venueId: a.venue_id
        }));
    },

    createAllergen: async (allergen: any) => {
        if (!isSupabaseConfigured()) return;
        const dbAllergen: any = {
            name: allergen.name,
            translations: allergen.translations
        };
        try {
            const result = await performActionViaApi('allergens', 'create', dbAllergen);
            const data = result && result.length > 0 ? result[0] : null;
            if (!data) throw new Error("Insert returned no data");
            return {
                id: data.id,
                name: data.name,
                translations: data.translations
            };
        } catch (e) {
            console.error("Create Allergen failed:", e);
            const { data, error } = await supabase.from('allergens').insert(dbAllergen).select().single();
            if (error) throw error;
            return { id: data.id, venueId: data.venue_id, name: data.name, translations: data.translations };
        }
    },

    updateAllergen: async (id: string, updates: any) => {
        if (!isSupabaseConfigured()) return;
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.translations !== undefined) dbUpdates.translations = updates.translations;

        try {
            await performActionViaApi('allergens', 'update', dbUpdates, id);
        } catch (e) {
            await supabase.from('allergens').update(dbUpdates).eq('id', id);
        }
    },

    deleteAllergen: async (id: string) => {
        if (!isSupabaseConfigured()) return;
        try {
            await performActionViaApi('allergens', 'delete', null, id);
        } catch (e) {
            await supabase.from('allergens').delete().eq('id', id);
        }
    },
};
