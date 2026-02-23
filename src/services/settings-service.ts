import { supabase } from "@/lib/supabase";
import { isSupabaseConfigured, performActionViaApi } from "./db-utils";

export const SettingsService = {
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

    updateAppSettings: async (key: string, value: unknown) => {
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
    }
};
