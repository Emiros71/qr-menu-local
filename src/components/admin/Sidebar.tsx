"use client";

import Link from "next/link";
import { LayoutDashboard, Store, LogOut, Settings, Menu, ChevronDown, ChevronRight, Utensils, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Venue } from "@/data/db";
import { usePathname } from "next/navigation";
import { AuthService, UserProfile } from "@/services/auth-service";

interface SidebarProps {
    venues: Venue[];
}

export default function AdminSidebar({ venues }: SidebarProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isVenuesExpanded, setIsVenuesExpanded] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        async function loadProfile() {
            const profile = await AuthService.getCurrentProfile();
            if (profile) setUserProfile(profile);
        }
        loadProfile();
    }, []);

    const isActive = (path: string) => pathname === path;
    const isVenueActive = (id: string) => pathname.includes(`/admin/venues/${id}`);

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden bg-white border-b border-zinc-200 p-4 flex items-center justify-between sticky top-0 z-30">
                <h2 className="text-lg font-bold tracking-tight text-zinc-900">
                    QR Menu <span className="text-primary">Admin</span>
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    <Menu className="h-6 w-6" />
                </Button>
            </div>

            {/* Sidebar Overlay for Mobile */}
            {/* Note: This is now rendered here but could be portal-ed. Since layout structure changed, we render it here */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside className={cn(
                "w-64 bg-white border-r border-zinc-200 fixed h-full z-50 transition-transform duration-300 ease-in-out md:translate-x-0 md:static flex flex-col",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 border-b border-zinc-100 hidden md:block">
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                        QR Menu <span className="text-primary">Admin</span>
                    </h2>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    <Link
                        href="/admin"
                        onClick={() => setIsSidebarOpen(false)}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                            isActive("/admin") ? "bg-primary/5 text-primary" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                        )}
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Genel Bakış
                    </Link>

                    {/* Venues Accordion */}
                    <div className="pt-2">
                        <button
                            onClick={() => setIsVenuesExpanded(!isVenuesExpanded)}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 group"
                        >
                            <div className="flex items-center gap-3">
                                <Store className="h-4 w-4" />
                                <span>Mekanlar</span>
                            </div>
                            {isVenuesExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>

                        {isVenuesExpanded && (
                            <div className="ml-4 mt-1 space-y-1 border-l border-zinc-200 pl-2">
                                {venues.map(venue => (
                                    <Link
                                        key={venue.id}
                                        href={`/admin/venues/${venue.id}`}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                                            isVenueActive(venue.id)
                                                ? "bg-primary/5 text-primary font-medium"
                                                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                                        )}
                                    >
                                        <Utensils className="h-3 w-3" />
                                        {venue.name}
                                    </Link>
                                ))}
                                <Link
                                    href="/admin/venues/new"
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-primary transition-colors font-medium uppercase tracking-wider"
                                >
                                    + Yeni Ekle
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <Link
                            href="/admin/logs"
                            onClick={() => setIsSidebarOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                                isActive("/admin/logs") ? "bg-primary/5 text-primary" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                            )}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            Sistem Kayıtları
                        </Link>
                        <Link
                            href="/admin/settings"
                            onClick={() => setIsSidebarOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                                isActive("/admin/settings") ? "bg-primary/5 text-primary" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                            )}
                        >
                            <Settings className="h-4 w-4" />
                            Ayarlar
                        </Link>

                        {/* Users (Role Based visually, but actually protected by layout/middleware in real requests) */}
                        {userProfile?.role === 'SUPER_ADMIN' && (
                            <Link
                                href="/admin/users"
                                onClick={() => setIsSidebarOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 mt-2 text-sm font-medium rounded-lg transition-colors border border-blue-100 bg-blue-50/30",
                                    isActive("/admin/users") ? "bg-blue-100 text-blue-700 border-blue-200" : "text-blue-600 hover:bg-blue-50"
                                )}
                            >
                                <Users className="h-4 w-4" />
                                Kullanıcılar
                            </Link>
                        )}
                    </div>
                </nav>

                <div className="p-4 border-t border-zinc-100 mt-auto">
                    <button
                        onClick={async () => {
                            const { createClient } = await import('@/utils/supabase/client');
                            const { AuditService } = await import('@/services/audit-service');
                            const supabase = createClient();

                            // Get user to log their email before signing out
                            const { data: { user } } = await supabase.auth.getUser();

                            await AuditService.log({
                                action: 'LOGOUT',
                                resource: 'auth',
                                details: { email: user?.email || 'unknown' }
                            });

                            await supabase.auth.signOut();
                            window.location.href = '/login';
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Çıkış Yap
                    </button>
                    {/* User Info from Supabase */}
                    <div className="mt-4 flex items-center gap-3 px-2">
                        <div className="h-8 w-8 rounded-full bg-zinc-200 overflow-hidden flex-shrink-0">
                            {userProfile ? (
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.full_name || userProfile.email)}`} alt="User" />
                            ) : (
                                <div className="h-full w-full bg-zinc-300 animate-pulse" />
                            )}
                        </div>
                        <div className="text-xs overflow-hidden">
                            <div className="font-bold text-zinc-900 truncate">
                                {userProfile ? (userProfile.full_name || userProfile.email) : "Yükleniyor..."}
                            </div>
                            <div className="text-zinc-500 truncate">
                                {userProfile?.role === 'SUPER_ADMIN' ? 'Süper Yönetici' : userProfile?.role === 'VENUE_MANAGER' ? 'Mekan Yöneticisi' : userProfile?.role === 'STAFF' ? 'Personel' : '...'}
                            </div>
                        </div>
                    </div>
                </div>
            </aside >
        </>
    );
}
