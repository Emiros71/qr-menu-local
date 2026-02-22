"use client";

import { useEffect, useState } from "react";
import { VenueService } from "@/services/venue-service";
import { Venue } from "@/data/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Store, TrendingUp, Users, DollarSign, Activity, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MainTrafficChart, TopProductsChart, CategoryDistributionChart } from "@/components/admin/Charts";

export default function AdminDashboard() {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const data = await VenueService.getVenues();
            setVenues(data);
            setLoading(false);
        }
        load();
    }, []);

    const totalVenues = venues.length;
    // Note: VenueService.getVenues() returns venues with empty arrays for products currently if fetched from Supabase via simple select.
    // To get accurate stats, we'd need a more complex query or service method. 
    // For dashboard stats, we usually have a dedicated 'getDashboardStats' endpoint.
    // For now, we'll display what we have.

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Genel Bakış</h1>
                    <p className="text-zinc-500 mt-2">Pazarlama ve operasyon verileri.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="text-zinc-900 border-zinc-300 hover:bg-zinc-50">Rapor İndir</Button>
                    <Button>Kampanya Oluştur</Button>
                </div>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg lg:col-span-2 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-medium opacity-90">Toplam Ciro (Tahmini)</h3>
                        <div className="text-4xl font-bold mt-2">₺124,500</div>
                        <div className="mt-4 flex items-center gap-2 text-sm opacity-90">
                            <TrendingUp className="h-4 w-4" />
                            <span>Geçen aya göre %12 artış</span>
                        </div>
                    </div>
                    {/* Decorative Circle */}
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
                    <div className="absolute top-8 right-8 w-16 h-16 bg-white/10 rounded-full" />
                </div>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500">Kayıtlı Restoran</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-zinc-900">{loading ? "..." : totalVenues}</div>
                        <div className="h-2 w-full bg-zinc-100 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-blue-500 w-full" />
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">Aktif sözleşmeli işletmeler.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500">Aktif Menü Görüntüleme</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-zinc-900">142</div>
                        <div className="flex items-center gap-2 text-green-600 text-xs font-medium mt-1">
                            <Activity className="h-3 w-3" />
                            <span>Şu an canlı</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Traffic Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Ziyaretçi Trafiği</CardTitle>
                        <CardDescription>Son 7 gün içindeki QR okutma sayıları.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MainTrafficChart />
                    </CardContent>
                </Card>

                {/* Insights / Marketing Suggestions */}
                <Card className="bg-amber-50/50 border-amber-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-800">
                            <AlertCircle className="h-5 w-5" />
                            Pazarlama Fırsatları
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-white rounded-lg border border-amber-100 shadow-sm">
                            <h4 className="font-bold text-amber-900 text-sm">Tatlı Satışlarını Artır</h4>
                            <p className="text-xs text-amber-700 mt-1">
                                Akşam yemeği sonrası tatlı görüntüleme oranı düşük (%12). "Kahve + Tatlı" kampanyası önerilir.
                            </p>
                            <Button size="sm" variant="outline" className="w-full mt-3 border-amber-300 text-amber-800 hover:bg-amber-50">Kampanyayı Başlat</Button>
                        </div>

                        <div className="p-4 bg-white rounded-lg border border-amber-100 shadow-sm">
                            <h4 className="font-bold text-amber-900 text-sm">Happy Hour</h4>
                            <p className="text-xs text-amber-700 mt-1">
                                One Bar için Cuma 18:00-20:00 arası trafik zirve yapıyor. Bu saatler için özel bildirim gönder.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Restoran Listesi */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-zinc-900">Restoranların</h2>
                    <Link href="/admin/venues/new">
                        <Button>+ Yeni Ekle</Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-10">Restoranlar yükleniyor...</div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {venues.map((venue) => (
                            <Card key={venue.id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle>{venue.name}</CardTitle>
                                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">Aktif</span>
                                    </div>
                                    <CardDescription className="line-clamp-1">{venue.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Link href={`/admin/venues/${venue.id}`}>
                                        <Button variant="outline" className="w-full">Yönet</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
