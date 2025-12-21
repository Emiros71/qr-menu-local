"use client";

import Link from "next/link";
import { LayoutDashboard, Store, LogOut, Settings, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans">

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
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "w-64 bg-white border-r border-zinc-200 fixed h-full z-50 transition-transform duration-300 ease-in-out md:translate-x-0 md:static",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 border-b border-zinc-100 hidden md:block">
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                        QR Menu <span className="text-primary">Admin</span>
                    </h2>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link
                        href="/admin"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-600 rounded-lg hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        Genel Bakış
                    </Link>
                    <Link
                        href="/admin/venues"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-600 rounded-lg hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                    >
                        <Store className="h-5 w-5" />
                        Restoranlar
                    </Link>
                    <Link
                        href="/admin/settings"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-600 rounded-lg hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                    >
                        <Settings className="h-5 w-5" />
                        Ayarlar
                    </Link>
                </nav>

                <div className="p-4 border-t border-zinc-100 mt-auto">
                    <button className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                        <LogOut className="h-5 w-5" />
                        Çıkış Yap
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-65px)] md:h-screen">
                {children}
            </main>
        </div>
    );
}
