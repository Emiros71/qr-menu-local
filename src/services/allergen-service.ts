import { supabase } from "@/lib/supabase";
import { isSupabaseConfigured, performActionViaApi } from "./db-utils";
import { Allergen } from "@/data/db";

export const AllergenService = {
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
    }
};
