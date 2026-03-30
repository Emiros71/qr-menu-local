"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { VenueService } from "@/services/venue-service";
import { AuthService } from "@/services/auth-service";
import { Venue } from "@/data/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { TrendingUp, Activity, Trash2, MousePointerClick, Smartphone, RefreshCw, BarChart2, Lightbulb, CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ServiceStatus } from "@/components/admin/ServiceStatus";
import { createClient } from "@/utils/supabase/client";
import dynamic from "next/dynamic";

const VisitorAreaChart = dynamic(() => import("@/components/admin/Charts").then(mod => mod.VisitorAreaChart), { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center text-muted-foreground">Yükleniyor...</div> });
const ProductBarChart = dynamic(() => import("@/components/admin/Charts").then(mod => mod.ProductBarChart), { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center text-muted-foreground">Yükleniyor...</div> });
import { format, subDays, subMonths } from "date-fns";
import { tr } from "date-fns/locale";

export default function AdminDashboard() {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [events, setEvents] = useState<any[]>([]);
    const [timeFilter, setTimeFilter] = useState<'all' | 'daily' | 'monthly'>('monthly');
    const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>('all');

    const loadData = async () => {
        setLoading(true);
        const profile = await AuthService.getCurrentProfile();
        const data = await VenueService.getVenues(profile);
        setVenues(data);

        // Fetch Analytics
        const supabase = createClient();
        let query = supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(2000);

        if (profile && profile.role !== 'SUPER_ADMIN') {
            if (profile.venue_ids && profile.venue_ids.length > 0) {
                query = query.in('venue_id', profile.venue_ids);
            }
        }

        if (timeFilter === 'daily') {
            query = query.gte('created_at', subDays(new Date(), 1).toISOString());
        } else if (timeFilter === 'monthly') {
            query = query.gte('created_at', subMonths(new Date(), 1).toISOString());
        }

        const { data: analyticsData } = await query;
        if (analyticsData) {
            setEvents(analyticsData);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeFilter]);



    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`"${name}" mekanını tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) return;
        try {
            await VenueService.deleteVenue(id);
            setVenues(prev => prev.filter(v => v.id !== id));
            alert("Mekan başarıyla silindi.");
        } catch (e) {
            console.error(e);
            alert("Silinirken bir hata oluştu.");
        }
    };

    const handleMoveVenue = async (index: number, direction: 'up' | 'down') => {
        const newVenues = [...venues];
        if (direction === 'up' && index > 0) {
            [newVenues[index - 1], newVenues[index]] = [newVenues[index], newVenues[index - 1]];
        } else if (direction === 'down' && index < newVenues.length - 1) {
            [newVenues[index + 1], newVenues[index]] = [newVenues[index], newVenues[index + 1]];
        } else {
            return; // invalid move
        }
        setVenues(newVenues);

        // Background sync
        try {
            await VenueService.updateVenueOrder(newVenues.map(v => v.id));
        } catch (e) {
            console.error("Sıralama güncellenirken hata:", e);
        }
    };

    // Derived filtering logic
    const filteredEvents = selectedVenueFilter === 'all' ? events : events.filter(e => e.venue_id === selectedVenueFilter);
    const filteredStats = {
        totalViews: filteredEvents.filter(e => e.event_type === 'view').length,
        totalClicks: filteredEvents.filter(e => e.event_type === 'click').length,
        uniqueSessions: new Set(filteredEvents.map(e => e.session_id)).size
    };

    const getClicksByProduct = () => {
        const clicks = filteredEvents.filter(e => e.event_type === 'click' && e.target_type === 'product');
        const counts: Record<string, number> = {};
        clicks.forEach(c => {
            const name = c.metadata?.productName || c.target_id.split('-')[0] || 'Bilinmeyen Ürün';
            counts[name] = (counts[name] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, clicks]) => ({ name: name.substring(0, 15) + "...", clicks, originalName: name }));
    };

    const getVisitorChartData = () => {
        const views = filteredEvents.filter(e => e.event_type === 'view');
        const dailyCounts: Record<string, number> = {};
        views.forEach(v => {
            let dateKey = format(new Date(v.created_at), 'd MMM', { locale: tr });
            if (timeFilter === 'daily') {
                dateKey = format(new Date(v.created_at), 'HH:00', { locale: tr });
            }
            dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
        });
        return Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));
    };

    const getPopupAnalytics = () => {
        const popupEvents = filteredEvents.filter(e =>
            e.event_type === 'view_popup' ||
            e.event_type === 'click_popup' ||
            e.event_type === 'dismiss_popup' ||
            e.event_type === 'VIEW_POPUP' ||
            e.event_type === 'CLICK_POPUP' ||
            e.event_type === 'DISMISS_POPUP'
        );

        const stats: Record<string, { views: number, clicks: number, dismisses: number, title: string }> = {};

        popupEvents.forEach(e => {
            const popupId = e.metadata?.popupId || 'unknown';
            const title = e.metadata?.title || 'İsimsiz Pop-up';

            if (!stats[popupId]) {
                stats[popupId] = { views: 0, clicks: 0, dismisses: 0, title };
            }

            const typeLower = e.event_type.toLowerCase();
            if (typeLower === 'view_popup') stats[popupId].views++;
            else if (typeLower === 'click_popup') stats[popupId].clicks++;
            else if (typeLower === 'dismiss_popup') stats[popupId].dismisses++;
        });

        return Object.entries(stats).map(([id, data]) => ({
            id,
            ...data,
            ctr: data.views > 0 ? ((data.clicks / data.views) * 100).toFixed(1) : '0.0'
        })).sort((a, b) => b.views - a.views);
    };

    const getMarketingSuggestions = () => {
        const topProducts = getClicksByProduct();
        if (topProducts.length === 0) return [];
        return [
            {
                title: "🔥 Popüler Ürün Fırsatı",
                desc: `"${topProducts[0]?.originalName || 'En popüler ürün'}" çok fazla inceleniyor (${topProducts[0]?.clicks} tıklanma). Satışa dönüştürmek için küçük bir 'Net Tutar' veya 'Yüzdelik' indirim tanımlayabilirsiniz.`
            },
            {
                title: "👋 Harekete Geçirici Pop-up",
                desc: `Müşterileriniz günde ortalama ${(filteredStats.totalViews / (timeFilter === 'monthly' ? 30 : 1)).toFixed(1)} kez menüyü açıyor. 'Kampanyalar' sekmesinden bir karşılama pop-up'ı ekleyerek onları en karlı kategorinize yönlendirin.`
            }
        ];
    };

    const productChartData = getClicksByProduct();
    const visitorChartData = getVisitorChartData();
    const popupAnalytics = getPopupAnalytics();
    const suggestions = getMarketingSuggestions();
    const totalVenues = venues.length;

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Genel Bakış</h1>
                    <p className="text-muted-foreground mt-2">Mekanlarınızın dijital performansı ve analitik verileri.</p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    {venues.length > 0 && (
                        <select
                            className="h-10 px-3 rounded-md border border-input bg-background/50 text-foreground text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedVenueFilter}
                            onChange={(e) => setSelectedVenueFilter(e.target.value)}
                        >
                            <option value="all">Tüm Mekanlar</option>
                            {venues.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    )}
                    <Button
                        variant="outline"
                        onClick={loadData}
                        disabled={loading}
                        className="text-foreground border-border hover:bg-muted transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Yenile
                    </Button>
                </div>
            </div>

            {/* Main KPI Cards (Dark Mode Fix - Text Foreground) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Toplam Görüntüleme</p>
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Activity className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-foreground mt-4">{loading ? "..." : filteredStats.totalViews}</h3>
                        <p className="text-xs text-emerald-500 mt-2 flex items-center font-medium">
                            <TrendingUp className="w-3 h-3 mr-1" /> Güncel Trafik
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Ürün Tıklamaları</p>
                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <MousePointerClick className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-foreground mt-4">{loading ? "..." : filteredStats.totalClicks}</h3>
                        <p className="text-xs text-muted-foreground mt-2 font-medium">
                            Toplam Menü Etkileşimi
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Tekil Oturum</p>
                            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                                <Smartphone className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-foreground mt-4">{loading ? "..." : filteredStats.uniqueSessions}</h3>
                        <p className="text-xs text-muted-foreground mt-2 font-medium">Benzersiz cihaz (QR Okuma)</p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Mekan Sayısı</p>
                            <div className="w-8 h-8 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-500">
                                <BarChart2 className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-foreground mt-4">{loading ? "..." : (selectedVenueFilter === 'all' ? totalVenues : 1)}</h3>
                        <div className="h-1.5 w-full bg-muted rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-foreground w-full opacity-50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Analytics & Traffic Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Marketing Suggestions */}
                <Card className="bg-card border-border shadow-sm lg:col-span-3">
                    <CardHeader className="bg-primary/5 pb-4 mb-4 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-full">
                                <Lightbulb className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="font-bold text-lg text-foreground">Pazarlama Raporu & Öneriler</CardTitle>
                                <CardDescription>Analiz sonuçlarına göre satışları artırmak için eylem planı kurguluyoruz.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-muted-foreground">Analiz ediliyor...</p>
                        ) : suggestions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {suggestions.map((s, idx) => (
                                    <div key={idx} className="p-5 border border-border rounded-xl bg-muted/30">
                                        <h4 className="font-bold text-sm text-foreground mb-2 flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-primary" />{s.title}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed pl-6">{s.desc}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 border border-dashed border-border rounded-xl text-center">
                                <p className="text-muted-foreground italic text-sm">Yeterli veri biriktiğinde size özel pazarlama önerileri burada sıralanacaktır.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. Visitor Growth Chart Area */}
                <Card className="bg-card border-border shadow-sm lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="font-bold text-foreground">Ziyaretçi Sayısı Trafiği</CardTitle>
                        <CardDescription>Menünüzü görüntüleyen ziyaretçilerin zaman içindeki frekansı.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">Yükleniyor...</div>
                        ) : visitorChartData.length > 0 ? (
                            <VisitorAreaChart data={visitorChartData} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
                                Yeterli veri bulunamadı.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 3. Popular Products Chart */}
                <Card className="bg-card border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="font-bold text-foreground">En Çok Tıklanan Ürünler</CardTitle>
                        <CardDescription>Müşterilerin incelediği.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">Yükleniyor...</div>
                        ) : productChartData.length > 0 ? (
                            <ProductBarChart data={productChartData} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
                                Yeterli veri bulunamadı.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 3.25 Marketing Suggestions */}
                <Card className="bg-card border-border shadow-sm lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="font-bold text-foreground">💡 Pazarlama & Kampanya Önerileri</CardTitle>
                        <CardDescription>Menü analizlerinize dayanarak satışları artıracak otomatik tavsiyeler.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="w-full h-32 flex items-center justify-center text-muted-foreground">Analiz yapılıyor...</div>
                        ) : suggestions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {suggestions.map((suggestion, idx) => (
                                    <div key={idx} className="p-4 border border-border rounded-xl bg-orange-500/5 hover:bg-orange-500/10 transition-colors">
                                        <h4 className="font-bold text-sm text-orange-600 mb-2">{suggestion.title}</h4>
                                        <p className="text-sm text-foreground/80 leading-relaxed">{suggestion.desc}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full h-32 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">
                                <Lightbulb className="w-8 h-8 mb-2 opacity-50" />
                                <p>Henüz yeterli veri oluşmadı.</p>
                                <p className="text-xs mt-1">Sistem, müşterilerinizin hareketlerini analiz ederek size öneriler sunacaktır.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 3.5 Popup Analytics */}
                <Card className="bg-card border-border shadow-sm lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="font-bold text-foreground">Kampanya & Pop-up Performansı</CardTitle>
                        <CardDescription>Mekanlarınızdaki pop-up&apos;ların görüntülenme ve tıklanma (İncele) oranları.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="w-full h-32 flex items-center justify-center text-muted-foreground">Yükleniyor...</div>
                        ) : popupAnalytics.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {popupAnalytics.map(p => (
                                    <div key={p.id} className="p-4 border border-border rounded-xl bg-muted/20">
                                        <h4 className="font-bold text-sm text-foreground mb-3 truncate" title={p.title}>{p.title}</h4>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Görüntüleme</p>
                                                <p className="text-lg font-bold text-blue-500 mt-1">{p.views}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Tıklama</p>
                                                <p className="text-lg font-bold text-emerald-500 mt-1">{p.clicks}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Tıklama Oranı</p>
                                                <p className="text-lg font-bold text-amber-500 mt-1">%{p.ctr}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full h-32 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
                                Kampanya/Pop-up verisi bulunamadı. Aktif bir pop-up yayında olmayabilir veya henüz kimse görüntülememiş olabilir.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 4. Event Logs List */}
                <Card className="bg-card border-border shadow-sm flex flex-col lg:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="font-bold text-foreground">Son Akışlar</CardTitle>
                            <CardDescription>Canlı hareket dökümü.</CardDescription>
                        </div>
                        <div className="flex bg-muted rounded-md p-1 border border-border">
                            <button onClick={() => setTimeFilter('daily')} className={`px-3 py-1 text-xs font-medium rounded ${timeFilter === 'daily' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>24 Saat</button>
                            <button onClick={() => setTimeFilter('monthly')} className={`px-3 py-1 text-xs font-medium rounded ${timeFilter === 'monthly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>30 Gün</button>
                            <button onClick={() => setTimeFilter('all')} className={`px-3 py-1 text-xs font-medium rounded ${timeFilter === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>Tümü</button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto max-h-[300px]">
                        <div className="space-y-4">
                            {loading ? (
                                <p className="text-center text-muted-foreground py-10">Yükleniyor...</p>
                            ) : filteredEvents.length > 0 ? (
                                filteredEvents.slice(0, 10).map(e => (
                                    <div key={e.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent cursor-default">
                                        <div className={`p-2 rounded-lg ${e.event_type === 'click' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-primary/10 text-primary'}`}>
                                            {e.event_type === 'click' ? <MousePointerClick className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm text-foreground">
                                                {e.event_type === 'view' ? 'Menü Oturumu Başladı' : `Tıklandı: ${e.metadata?.productName || 'Menü Ürünü'}`}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {new Date(e.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} • QR-{e.session_id.substring(0, 6)} • {venues.find(v => v.id === e.venue_id)?.name || 'Mekan'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground py-10">Kayıtlı akış bulunamadı.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* System Status Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3">
                    <ServiceStatus />
                </div>
            </div>

            {/* Venue List */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">Mekan Yönetimi</h2>
                        <p className="text-sm text-muted-foreground">İşletmelerinizi ve menüleri düzenleyin.</p>
                    </div>
                    <Link href="/admin/venues/new">
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all">+ Yeni Mekan</Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-muted-foreground">Yükleniyor...</div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {venues.map((venue, index) => (
                            <Card key={venue.id} className="bg-card text-card-foreground border-border shadow-sm hover:shadow-md transition-all group overflow-hidden">
                                <CardHeader className="bg-muted/30 border-b border-border flex-row items-start justify-between p-5 space-y-0 relative">
                                    <div className="absolute inset-0 opacity-10 bg-cover bg-center" style={{ backgroundImage: `url(${venue.coverImage || ''})` }}></div>
                                    <div className="relative z-10 w-full">
                                        <div className="flex justify-between items-start w-full">
                                            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors text-foreground">{venue.name}</CardTitle>
                                            <span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md font-bold uppercase tracking-wider">Aktif</span>
                                        </div>
                                        <CardDescription className="line-clamp-1 mt-1 text-sm">
                                            {venue.description || "QR Menü Sistemi"}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 relative z-10">
                                    <div className="flex gap-2">
                                        <div className="flex border border-border rounded-md overflow-hidden bg-background shrink-0">
                                            <Button
                                                variant="ghost"
                                                className="w-8 h-10 px-0 rounded-none border-r border-border hover:bg-muted text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                                                onClick={() => handleMoveVenue(index, 'up')}
                                                disabled={index === 0}
                                                title="Yukarı Taşı"
                                            >
                                                <ChevronUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="w-8 h-10 px-0 rounded-none hover:bg-muted text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                                                onClick={() => handleMoveVenue(index, 'down')}
                                                disabled={index === venues.length - 1}
                                                title="Aşağı Taşı"
                                            >
                                                <ChevronDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <Link href={`/admin/venues/${venue.id}`} className="flex-1">
                                            <Button variant="outline" className="w-full h-10 bg-background hover:bg-muted transition-colors text-foreground">Yönet</Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleDelete(venue.id as string, venue.name)}
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-border w-10 h-10 px-0 transition-colors shrink-0"
                                            title="Mekanı Sil"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
