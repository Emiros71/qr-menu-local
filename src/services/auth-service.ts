import { createClient } from "@/utils/supabase/client";

export type UserRole = 'SUPER_ADMIN' | 'VENUE_MANAGER' | 'STAFF' | null;

export interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    venue_ids: string[];
}

export const AuthService = {
    // Get the current Supabase Auth user
    getCurrentUser: async () => {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;
        return user;
    },

    // Check if Supabase is configured
    isConfigured: () => {
        return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    },

    // Get the extended profile (including RBAC roles) from the profiles table
    getCurrentProfile: async (): Promise<UserProfile | null> => {
        if (!AuthService.isConfigured()) return null;

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching profile:", error);
            }

            if (!data) {
                return null;
            }

            return {
                id: user.id,
                email: user.email || '',
                full_name: data.full_name || null,
                role: data.role || null,
                venue_ids: data.venue_ids || []
            };
        } catch (e) {
            console.error("Profile fetch error:", e);
            return null;
        }
    },

    // Sign out wrapper
    signOut: async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
    }
};
