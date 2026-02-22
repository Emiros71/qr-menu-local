import { createClient } from "@/utils/supabase/client";

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
    return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

// Helper to parse hybrid image field (support for legacy URL string or new JSON object)
export const parseImageField = (val: string | null | undefined) => {
    if (!val) return { image: undefined, coverImage: undefined };
    try {
        if (val.startsWith('{')) {
            const json = JSON.parse(val);
            return { image: json.icon, coverImage: json.cover };
        }
    } catch (e) { }
    return { image: val, coverImage: undefined };
};

// Helper to perform generic actions via API (bypassing Client RLS)
export async function performActionViaApi(table: string, action: 'update' | 'delete' | 'create', data: any, id?: string) {
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
