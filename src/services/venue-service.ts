import { supabase } from "@/lib/supabase";
import { venues as mockVenues, Venue } from "@/data/db";
import { isSupabaseConfigured, parseImageField, performActionViaApi } from "./db-utils";

export const VenueService = {
    // Get all venues (for landing page / admin list)
    getVenues: async (profile?: { role: string | null; venue_ids?: string[] | null } | null): Promise<Venue[]> => {
        if (!isSupabaseConfigured()) {
            console.log("Supabase not configured, using mock data.");
            return profile && profile.role !== 'SUPER_ADMIN' && profile.venue_ids && profile.venue_ids.length > 0
                ? mockVenues.filter(v => profile.venue_ids!.includes(v.id))
                : mockVenues;
        }

        let query = supabase.from('venues').select('*').order('order_index', { ascending: true });
        if (profile && profile.role !== 'SUPER_ADMIN') {
            if (profile.venue_ids && profile.venue_ids.length > 0) {
                query = query.in('id', profile.venue_ids);
            } else {
                // Return empty if they have no venues assigned
                return [];
            }
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching venues:", error);
            return [];
        }

        return data.map((v: Record<string, unknown>) => ({
            ...v,
            orderIndex: v.order_index,
            categories: [] as [],
            products: [] as []
        })) as unknown as Venue[];
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

        const products = (prodData || []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
            description: p.description as string,
            price: p.price as number,
            image: p.image as string,
            categoryId: p.category_id as string,
            venueId: p.venue_id as string,
            isAvailable: p.is_available as boolean,
            allergens: p.allergens as string[],
            isChefRecommendation: p.is_chef_recommendation as boolean,
            labels: p.labels as string[],
            currency: 'TRY',
            translations: typeof p.translations === 'string' ? JSON.parse(p.translations as string) : p.translations,
            startTime: p.start_time as string,
            endTime: p.end_time as string,
            discount_type: p.discount_type as 'percentage' | 'fixed' | null,
            discount_amount: p.discount_amount as number
        }));

        const categories = (catData || []).map((c: Record<string, unknown>) => {
            const { image, coverImage } = parseImageField(c.image as string | null);
            return {
                id: c.id as string,
                name: c.name as string,
                image,
                coverImage,
                parentId: c.parent_id as string | null,
                venueId: c.venue_id as string,
                startTime: c.start_time as string,
                endTime: c.end_time as string,
                translations: typeof c.translations === 'string' ? JSON.parse(c.translations as string) : c.translations as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                isAvailable: c.is_available !== false
            };
        });

        const venue: Venue = {
            id: venueData.id,
            slug: venueData.slug,
            name: venueData.name,
            description: venueData.description,
            logo: venueData.logo,
            orderIndex: venueData.order_index,
            coverImage: venueData.cover_image || venueData.coverImage,
            timezone: venueData.timezone,
            theme: typeof venueData.theme === 'string' ? JSON.parse(venueData.theme) : venueData.theme,
            supportedLanguages: venueData.supported_languages,
            defaultLanguage: venueData.default_language,
            categories: categories,
            products: products,
            allergens: (allergenData || []).map((a: Record<string, unknown>) => ({
                id: a.id as string,
                name: a.name as string,
                translations: typeof a.translations === 'string' ? JSON.parse(a.translations as string) : a.translations
            })),
            popup_settings: typeof venueData.popup_settings === 'string' ? JSON.parse(venueData.popup_settings) : venueData.popup_settings
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

        const products = (prodData || []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
            description: p.description as string,
            price: p.price as number,
            image: p.image as string,
            categoryId: p.category_id as string,
            venueId: p.venue_id as string,
            isAvailable: p.is_available as boolean,
            allergens: p.allergens as string[],
            isChefRecommendation: p.is_chef_recommendation as boolean,
            labels: p.labels as string[],
            currency: 'TRY',
            translations: p.translations as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            startTime: p.start_time as string,
            endTime: p.end_time as string,
            discount_type: p.discount_type as 'percentage' | 'fixed' | null,
            discount_amount: p.discount_amount as number
        }));

        const categories = (catData || []).map((c: Record<string, unknown>) => {
            const { image, coverImage } = parseImageField(c.image as string | null);
            return {
                id: c.id as string,
                name: c.name as string,
                image,
                coverImage,
                parentId: c.parent_id as string | null,
                venueId: c.venue_id as string,
                startTime: c.start_time as string,
                endTime: c.end_time as string,
                translations: c.translations as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                isAvailable: c.is_available !== false
            };
        });

        const venue: Venue = {
            id: venueData.id,
            slug: venueData.slug,
            name: venueData.name,
            description: venueData.description,
            logo: venueData.logo,
            orderIndex: venueData.order_index,
            coverImage: venueData.cover_image || venueData.coverImage,
            timezone: venueData.timezone,
            theme: typeof venueData.theme === 'string' ? JSON.parse(venueData.theme) : venueData.theme,
            categories: categories,
            products: products,
            supportedLanguages: venueData.supported_languages,
            defaultLanguage: venueData.default_language,
            allergens: (allergenData || []).map((a: Record<string, unknown>) => ({
                id: a.id as string,
                name: a.name as string,
                translations: typeof a.translations === 'string' ? JSON.parse(a.translations as string) : a.translations
            })),
            popup_settings: typeof venueData.popup_settings === 'string' ? JSON.parse(venueData.popup_settings) : venueData.popup_settings
        };

        return venue;
    },

    createVenue: async (venueConfig: Partial<Venue>): Promise<Venue | null> => {
        if (!isSupabaseConfigured()) return null;

        const dbInsert: Record<string, unknown> = { ...venueConfig };

        // Remove relationships that don't belong in venues table
        delete dbInsert.categories;
        delete dbInsert.products;
        delete dbInsert.allergens;
        delete dbInsert.id; // Let DB generate UUID

        if (venueConfig.coverImage !== undefined) {
            dbInsert.cover_image = venueConfig.coverImage;
            delete dbInsert.coverImage;
        }
        if (venueConfig.supportedLanguages !== undefined) {
            dbInsert.supported_languages = venueConfig.supportedLanguages;
            delete dbInsert.supportedLanguages;
        }
        if (venueConfig.defaultLanguage !== undefined) {
            dbInsert.default_language = venueConfig.defaultLanguage;
            delete dbInsert.defaultLanguage;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            dbInsert.user_id = user.id;
        }

        try {
            const data = await performActionViaApi('venues', 'create', dbInsert);
            if (data && data.length > 0) {
                return data[0] as unknown as Venue;
            }
            return null;
        } catch (e: any) {
            console.error("Error creating venue:", JSON.stringify(e, null, 2));
            console.error("Original error object:", e);
            return null;
        }
    },

    updateVenue: async (id: string, updates: Partial<Venue>) => {
        if (!isSupabaseConfigured()) return;

        const dbUpdates: Record<string, unknown> = { ...updates };
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

    updateVenueTheme: async (id: string, theme: unknown) => {
        if (!isSupabaseConfigured()) return;

        try {
            await performActionViaApi('venues', 'update', { theme }, id);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) {
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
    },

    updateVenueOrder: async (orderedIds: string[]) => {
        if (!isSupabaseConfigured()) {
            orderedIds.forEach((id, index) => {
                const v = mockVenues.find(v => v.id === id);
                if (v) v.orderIndex = index;
            });
            return;
        }

        try {
            // Update order_index for each id one by one via API
            for (let index = 0; index < orderedIds.length; index++) {
                const id = orderedIds[index];
                await performActionViaApi('venues', 'update', { order_index: index }, id);
            }
        } catch (e) {
            console.error("Error updating venue order via API:", e);
            // Fallback direct updates
            for (let index = 0; index < orderedIds.length; index++) {
                const id = orderedIds[index];
                await supabase.from('venues').update({ order_index: index }).eq('id', id);
            }
        }
    }
};
