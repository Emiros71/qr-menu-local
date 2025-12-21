import { supabase } from "@/lib/supabase";
import { venues as mockVenues, Venue } from "@/data/db";

// Helper to check if Supabase is configured
const isSupabaseConfigured = () => {
    return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

export const DbService = {
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
        // For now assuming 1:1 mapping mostly, but we need to fetch nested categories/products usually
        // Supabase simple query:
        // This is a simplified fetch. In reality, we'd probably want to join or fetch separately.
        return data.map((v: any) => ({
            ...v,
            // Default empty arrays because simple 'select * from venues' won't return joined children
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

        const venue: Venue = {
            ...venueData,
            categories: catData || [],
            products: prodData || []
        };

        return venue;
    }
};
