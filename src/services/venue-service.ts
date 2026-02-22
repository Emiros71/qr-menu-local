import { supabase } from "@/lib/supabase";
import { venues as mockVenues, Venue } from "@/data/db";
import { isSupabaseConfigured, parseImageField, performActionViaApi } from "./db-utils";

export const VenueService = {
    // Get all venues (for landing page / admin list)
    getVenues: async (profile?: { role: string | null; venue_id: string | null } | null): Promise<Venue[]> => {
        if (!isSupabaseConfigured()) {
            console.log("Supabase not configured, using mock data.");
            return profile && profile.role !== 'SUPER_ADMIN' && profile.venue_id
                ? mockVenues.filter(v => v.id === profile.venue_id)
                : mockVenues;
        }

        let query = supabase.from('venues').select('*');
        if (profile && profile.role !== 'SUPER_ADMIN' && profile.venue_id) {
            query = query.eq('id', profile.venue_id);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching venues:", error);
            return [];
        }

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

        const { data: venueData, error: venueError } = await supabase
            .from('venues')
            .select('*')
            .eq('slug', slug)
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
            translations: typeof p.translations === 'string' ? JSON.parse(p.translations) : p.translations,
            startTime: p.start_time,
            endTime: p.end_time
        }));

        const categories = (catData || []).map((c: any) => {
            const { image, coverImage } = parseImageField(c.image);
            return {
                id: c.id,
                name: c.name,
                image: image,
                coverImage: coverImage,
                venueId: c.venue_id,
                startTime: c.start_time,
                endTime: c.end_time,
                translations: typeof c.translations === 'string' ? JSON.parse(c.translations) : c.translations
            };
        });

        const venue: Venue = {
            id: venueData.id,
            slug: venueData.slug,
            name: venueData.name,
            coverImage: venueData.cover_image || venueData.coverImage,
            timezone: venueData.timezone,
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
            translations: p.translations,
            startTime: p.start_time,
            endTime: p.end_time
        }));

        const categories = (catData || []).map((c: any) => {
            const { image, coverImage } = parseImageField(c.image);
            return {
                id: c.id,
                name: c.name,
                image: image,
                coverImage: coverImage,
                venueId: c.venue_id,
                startTime: c.start_time,
                endTime: c.end_time,
                translations: c.translations
            };
        });

        const venue: Venue = {
            id: venueData.id,
            slug: venueData.slug,
            name: venueData.name,
            coverImage: venueData.cover_image || venueData.coverImage,
            timezone: venueData.timezone,
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
        if (updates.timezone !== undefined) {
            dbUpdates.timezone = updates.timezone;
        }

        try {
            await performActionViaApi('venues', 'update', dbUpdates, id);
        } catch (e) {
            console.error(e);
            const { error } = await supabase.from('venues').update(dbUpdates).eq('id', id);
            if (error) throw error;
        }
    },

    updateVenueTheme: async (id: string, theme: any) => {
        if (!isSupabaseConfigured()) return;

        try {
            await performActionViaApi('venues', 'update', { theme }, id);
        } catch (e) {
            const { error } = await supabase.from('venues').update({ theme }).eq('id', id);
            if (error) throw error;
        }
    },

    deleteVenue: async (id: string) => {
        if (!isSupabaseConfigured()) return;

        try {
            await performActionViaApi('venues', 'delete', null, id);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }
};
