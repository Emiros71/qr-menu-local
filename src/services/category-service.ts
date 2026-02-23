import { supabase } from "@/lib/supabase";
import { isSupabaseConfigured, performActionViaApi } from "./db-utils";
import { Category } from "@/data/db";

export const CategoryService = {
    updateCategory: async (id: string, updates: Partial<Category>) => {
        if (!isSupabaseConfigured()) return;

        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.translations !== undefined) dbUpdates.translations = updates.translations;

        // Handle Time Management
        if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
        if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;

        if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;

        // Handle Image Store (JSON or String)
        if (updates.image !== undefined || updates.coverImage !== undefined) {
            const icon = updates.image;
            const cover = updates.coverImage;

            // Store as JSON
            dbUpdates.image = JSON.stringify({ icon, cover });
        }

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
            await performActionViaApi('categories', 'delete', null, id);
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    updateCategoryOrder: async (orderedIds: string[]) => {
        if (!isSupabaseConfigured()) return;
        try {
            // Update order_index for each id one by one via API
            // Or ideally an RPC, but we'll do it sequentially for now
            const promises = orderedIds.map((id, index) =>
                performActionViaApi('categories', 'update', { order_index: index }, id)
            );
            await Promise.all(promises);
        } catch (e) {
            console.error("Failed to update category order", e);
            throw e;
        }
    },

    createCategory: async (category: Record<string, unknown>) => {
        if (!isSupabaseConfigured()) return;

        const dbCategory: Record<string, unknown> = {
            venue_id: category.venueId,
            name: category.name,
            order_index: 0
        };

        if (category.translations) dbCategory.translations = category.translations;

        // Handle Time Management
        if (category.startTime !== undefined) dbCategory.start_time = category.startTime;
        if (category.endTime !== undefined) dbCategory.end_time = category.endTime;

        if (category.isAvailable !== undefined) dbCategory.is_available = category.isAvailable;

        // Use Image column to store both icon and cover as JSON
        const icon = category.image;
        const cover = category.coverImage;
        if (icon || cover) {
            dbCategory.image = JSON.stringify({ icon, cover });
        }

        try {
            const result = await performActionViaApi('categories', 'create', dbCategory);
            const data = result && result.length > 0 ? result[0] : null;
            if (!data) throw new Error("Insert returned no data");

            return {
                id: data.id,
                name: data.name,
                image: category.image,
                coverImage: category.coverImage,
                venueId: data.venue_id,
                translations: data.translations,
                startTime: data.start_time,
                endTime: data.end_time
            };
        } catch (e) {
            console.error("API Create Category failed:", e);
            const { data, error } = await supabase.from('categories').insert(dbCategory).select().single();
            if (error) throw error;
            return {
                id: data.id,
                name: data.name,
                image: category.image,
                coverImage: category.coverImage,
                venueId: data.venue_id,
                translations: data.translations,
                startTime: data.start_time,
                endTime: data.end_time
            };
        }
    }
};
