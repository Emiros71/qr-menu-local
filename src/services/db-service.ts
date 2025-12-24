import { supabase } from "@/lib/supabase";
import { venues as mockVenues, Venue } from "@/data/db";

// Helper to check if Supabase is configured
const isSupabaseConfigured = () => {
    return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

// Helper to perform updates via API (bypassing Client RLS)
async function updateViaApi(table: string, id: string, updates: any) {
    const response = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, updates })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API update failed for ${table}`);
    }
    return await response.json();
}

async function deleteViaApi(table: string, id: string) {
    const response = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, action: 'delete' })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API delete failed for ${table}`);
    }
    return await response.json();
}

export const DbService = {
    // ... (keep exisitng methods)

    updateCategory: async (id: string, name: string) => {
        if (!isSupabaseConfigured()) return;
        try {
            await updateViaApi('categories', id, { name });
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    deleteCategory: async (id: string) => {
        if (!isSupabaseConfigured()) return;
        try {
            await deleteViaApi('categories', id);
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    deleteProduct: async (id: string) => {
        if (!isSupabaseConfigured()) return;
        try {
            await deleteViaApi('products', id);
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

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
            .order('order_index');

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
            labels: p.labels, // jsonb usually stays same
            currency: 'TRY'
        }));

        const categories = (catData || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            venueId: c.venue_id
        }));

        const venue: Venue = {
            id: venueData.id,
            slug: venueData.slug,
            name: venueData.name,
            coverImage: venueData.cover_image || venueData.coverImage, // handle both casing just in case
            theme: typeof venueData.theme === 'string' ? JSON.parse(venueData.theme) : venueData.theme, // Handle JSONB if needed, or if supabase returns object
            categories: categories,
            products: products
        };

        return venue;
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
            currency: 'TRY'
        }));

        const categories = (catData || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            venueId: c.venue_id
        }));

        const venue: Venue = {
            id: venueData.id,
            slug: venueData.slug,
            name: venueData.name,
            coverImage: venueData.cover_image || venueData.coverImage,
            theme: typeof venueData.theme === 'string' ? JSON.parse(venueData.theme) : venueData.theme,
            categories: categories,
            products: products
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

        // Use API to bypass RLS
        try {
            await updateViaApi('venues', id, dbUpdates);
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
            await updateViaApi('venues', id, { theme });
        } catch (e) {
            const { error } = await supabase.from('venues').update({ theme }).eq('id', id);
            if (error) throw error;
        }
    },

    updateProduct: async (id: string, updates: Partial<Venue['products'][0]>) => {
        if (!isSupabaseConfigured()) {
            console.log("Mock update product", id, updates);
            return;
        }

        // Strict allowlist mapping to prevent sending unknown columns to Supabase
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

        // If no fields to update, return early
        if (Object.keys(dbUpdates).length === 0) return;

        console.log("Updating product payload via API:", dbUpdates);

        try {
            await updateViaApi('products', id, dbUpdates);
            console.log("Product updated successfully via API");
        } catch (err) {
            console.error("API Update failed, falling back to direct:", err);
            const { error } = await supabase.from('products').update(dbUpdates).eq('id', id);
            if (error) throw error;
        }
    },

    createProduct: async (product: any) => {
        if (!isSupabaseConfigured()) return;
        const dbProduct: any = { ...product };
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

        // Ideally Create should also go through API if RLS blocks Insert
        const { data, error } = await supabase.from('products').insert(dbProduct).select().single();
        if (error) throw error;

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
    },

    createCategory: async (category: any) => {
        if (!isSupabaseConfigured()) return;

        const dbCategory = {
            venue_id: category.venueId,
            name: category.name,
            order_index: 0
        };

        const { data, error } = await supabase.from('categories').insert(dbCategory).select().single();
        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            venueId: data.venue_id
        };
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

        // Upsert: update if exists, insert if not
        const { error } = await supabase.from('app_settings').upsert({
            key,
            value,
            updated_at: new Date().toISOString()
        });

        if (error) throw error;
    }
};
