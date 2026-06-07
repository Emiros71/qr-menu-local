import AdminSidebar from "@/components/admin/Sidebar";
import { createClient } from "@/utils/supabase/server";
import { getAuthenticatedActor } from "@/server/auth";
import { Venue } from "@/data/db";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const actor = await getAuthenticatedActor();
    if (!actor) {
        redirect("/");
    }

    const { profile } = actor;
    const supabase = await createClient();

    // Fetch venues with the cookie-aware server client so admin UI does not
    // depend on anonymous/public select policies.
    let venues: Venue[] = [];
    let query = supabase.from('venues').select('*').order('order_index', { ascending: true });

    if (profile.role !== 'SUPER_ADMIN') {
        if (profile.venue_ids.length > 0) {
            query = query.in('id', profile.venue_ids);
        } else {
            query = null as never;
        }
    }

    if (query) {
        const { data, error } = await query;
        if (error) {
            console.warn("Venue lookup failed in admin layout.", error);
        } else {
            venues = (data || []).map((venue: Record<string, unknown>) => ({
                id: String(venue.id || ''),
                slug: String(venue.slug || ''),
                name: String(venue.name || ''),
                description: typeof venue.description === 'string' ? venue.description : undefined,
                logo: typeof venue.logo === 'string' ? venue.logo : undefined,
                coverImage: typeof venue.cover_image === 'string'
                    ? venue.cover_image
                    : typeof venue.coverImage === 'string'
                        ? venue.coverImage
                        : undefined,
                timezone: typeof venue.timezone === 'string' ? venue.timezone : undefined,
                theme: (typeof venue.theme === 'object' && venue.theme !== null ? venue.theme : {}) as Venue['theme'],
                categories: [],
                products: [],
                allergens: [],
                supportedLanguages: Array.isArray(venue.supported_languages)
                    ? venue.supported_languages as string[]
                    : undefined,
                defaultLanguage: typeof venue.default_language === 'string'
                    ? venue.default_language
                    : undefined,
                popup_settings: venue.popup_settings,
                orderIndex: typeof venue.order_index === 'number' ? venue.order_index : 0,
            }));
        }
    }

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans">
            <AdminSidebar venues={venues} />

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-65px)] md:h-screen">
                {children}
            </main>
        </div>
    );
}
