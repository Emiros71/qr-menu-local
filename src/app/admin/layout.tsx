import { VenueService } from "@/services/venue-service";
import AdminSidebar from "@/components/admin/Sidebar";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let profile = null;
    if (user) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, venue_ids')
                .eq('id', user.id)
                .single();

            if (error) {
                console.warn("Profiles lookup failed in admin layout, using auth metadata fallback.", error);
            }

            profile = data
                ? { role: data.role, venue_ids: data.venue_ids || [] }
                : { role: user.user_metadata?.role || 'SUPER_ADMIN', venue_ids: [] };
        } catch (error) {
            console.warn("Profiles table is not ready yet, using auth metadata fallback.", error);
            profile = { role: user.user_metadata?.role || 'SUPER_ADMIN', venue_ids: [] };
        }
    }

    // Fetch filtered venues on the server based on RBAC Profile
    const venues = await VenueService.getVenues(profile);

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
