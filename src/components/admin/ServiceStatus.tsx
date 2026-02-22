"use client";

import { useEffect, useState } from "react";
import { Server, CheckCircle2, AlertCircle, Loader2, ArrowRight, Info } from "lucide-react";

interface StatusResult {
    name: string;
    status: 'online' | 'error';
    latencyMs: number;
    error?: string;
}

interface HealthResponse {
    status: 'healthy' | 'degraded';
    services: StatusResult[];
}

const SERVICE_INFO: Record<string, string> = {
    VenueService: "Mekan temel bilgileri, tema ayarları ve yapılandırması (venues tablosu).",
    CategoryService: "Ürün kategorileri ve görünürlük/çeviri ayarları (categories tablosu).",
    ProductService: "Katalog ürünleri, fiyatlamalar ve detaylar (products tablosu).",
    AllergenService: "Global alerjen kütüphanesi ve uyarıları (allergens tablosu).",
    SettingsService: "SaaS sisteminin genel çalışma ayarları (app_settings tablosu)."
};

export function ServiceStatus() {
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastCheck, setLastCheck] = useState<Date | null>(null);

    const checkHealth = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/health');
            const data = await res.json();
            setHealth(data);
            setLastCheck(new Date());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    return (
        <div className="bg-white border border-zinc-200 rounded-none shadow-sm relative overflow-hidden group">
            {/* Top decorative sharp line */}
            <div className={`absolute top-0 left-0 right-0 h-1 transition-colors ${health?.status === 'degraded' ? 'bg-red-500' : 'bg-emerald-500'}`} />

            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0">
                            <Server className="h-5 w-5 text-zinc-900" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-zinc-900 uppercase">Sistem Sağlığı</h2>
                            <p className="text-xs text-zinc-500 font-medium">DOMAIN SERVİS DURUMLARI</p>
                        </div>
                    </div>

                    <button
                        onClick={checkHealth}
                        disabled={loading}
                        className="text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1.5"
                    >
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yenile'}
                    </button>
                </div>

                {loading && !health ? (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                        <Loader2 className="h-6 w-6 animate-spin mb-3" />
                        <span className="text-sm font-medium tracking-wide">Sağlık durumu kontrol ediliyor...</span>
                    </div>
                ) : health ? (
                    <div className="space-y-3">
                        {health.services.map((service, i) => (
                            <div
                                key={service.name}
                                className="flex items-center justify-between p-3 border border-zinc-100 bg-zinc-50 hover:bg-white hover:border-zinc-200 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-2 w-2 rounded-full ${service.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                                    <div className="flex items-center gap-1.5 relative group/info">
                                        <span className="text-sm font-semibold tracking-wide text-zinc-800">{service.name}</span>
                                        <Info className="h-3 w-3 text-zinc-400 hover:text-zinc-600 transition-colors cursor-help" />

                                        {/* Tooltip */}
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-48 p-2 bg-zinc-800 text-zinc-100 text-xs rounded border border-zinc-700 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-20 shadow-lg pointer-events-none before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-4 before:border-transparent before:border-r-zinc-800">
                                            {SERVICE_INFO[service.name]}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs font-mono">
                                    {service.status === 'error' && (
                                        <span className="text-red-500 max-w-[120px] truncate" title={service.error}>{service.error}</span>
                                    )}
                                    <span className={`px-2 py-0.5 border ${service.latencyMs < 100 ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : service.latencyMs < 300 ? 'text-amber-700 border-amber-200 bg-amber-50' : 'text-red-700 border-red-200 bg-red-50'}`}>
                                        {service.latencyMs}ms
                                    </span>
                                </div>
                            </div>
                        ))}

                        <div className="pt-4 mt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400 font-mono">
                            <span>Son kontrol: {lastCheck?.toLocaleTimeString()}</span>
                            <span className={`px-2 py-1 ${health.status === 'healthy' ? 'text-emerald-600' : 'text-red-600'}`}>
                                STATÜ: {health.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center text-sm text-red-500 font-medium">
                        Sağlık verileri alınamadı.
                    </div>
                )}
            </div>
        </div>
    );
}
