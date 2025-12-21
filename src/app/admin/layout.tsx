import { DbService } from "@/services/db-service";
import AdminSidebar from "@/components/admin/Sidebar";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Fetch venues on the server
    const venues = await DbService.getVenues();

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
