import { supabase } from "@/lib/supabase";
import { isSupabaseConfigured, performActionViaApi } from "./db-utils";
import { Allergen } from "@/data/db";

interface AllergenRow {
    id: string;
    name: string;
    translations: Record<string, { name: string }>;
    venue_id?: string;
}

interface AllergenInput {
    name: string;
    translations: Record<string, { name: string }>;
}

export const AllergenService = {
    getAllergens: async (): Promise<Allergen[]> => {
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase.from('allergens').select('*').order('name');
        if (error) {
            console.error("Error fetching allergens:", error);
            return [];
        }
        return (data as AllergenRow[]).map((a) => ({
            id: a.id,
            name: a.name,
            translations: a.translations,
            venueId: a.venue_id
        }));
    },

    createAllergen: async (allergen: AllergenInput) => {
        if (!isSupabaseConfigured()) return;
        const dbAllergen = {
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) {
            ;
            const { data, error } = await supabase.from('allergens').insert(dbAllergen).select().single();
            if (error) throw error;
            return { id: data.id, venueId: data.venue_id, name: data.name, translations: data.translations };
        }
    },

    updateAllergen: async (id: string, updates: Partial<AllergenInput>) => {
        if (!isSupabaseConfigured()) return;
        const dbUpdates: Partial<AllergenInput> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.translations !== undefined) dbUpdates.translations = updates.translations;

        try {
            await performActionViaApi('allergens', 'update', dbUpdates, id);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) {
            await supabase.from('allergens').update(dbUpdates).eq('id', id);
        }
    },

    deleteAllergen: async (id: string) => {
        if (!isSupabaseConfigured()) return;
        try {
            await performActionViaApi('allergens', 'delete', null, id);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) {
            await supabase.from('allergens').delete().eq('id', id);
        }
    }
};
