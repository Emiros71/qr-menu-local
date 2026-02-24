"use client";

import Image from "next/image";
import Link from "next/link";
import { Instagram, Globe, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { VenueService } from "@/services/venue-service";
import { SettingsService } from "@/services/settings-service";
import { Venue } from "@/data/db";

export default function LandingPage() {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);

    // Default settings
    const [settings, setSettings] = useState({
        backgroundImage: "/crowne_plaza_bg.jpg",
        title: "CROWNE PLAZA",
        subtitle: "ANKARA",
        instagramUrl: "https://instagram.com",
        websiteUrl: "https://crowneplaza.com"
    });

    useEffect(() => {
        async function load() {
            setLoading(true);
            // Load venues
            const vData = await VenueService.getVenues();
            setVenues(vData);

            // Load global settings
            const sData = await SettingsService.getAppSettings();
            if (sData) {
                setSettings(sData);
            }

            setLoading(false);
        }
        load();
    }, []);

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black">

            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <Image
                    src={settings.backgroundImage || "/crowne_plaza_bg.jpg"}
                    alt="Background"
                    fill
                    className="object-cover opacity-60"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-md px-6 py-12 flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in duration-700">

                {/* Brand Logo / Title */}
                <div className="space-y-4">
                    {(settings as any).landingLogo ? (
                        <div className={`relative mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 ${(!settings.title && !settings.subtitle) ? "w-72 h-72 mb-8" : "w-48 h-48 mb-4"}`}>
                            <Image src={(settings as any).landingLogo} fill alt="Brand Logo" className="object-contain drop-shadow-2xl" />
                        </div>
                    ) : (
                        <div className={`bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto border border-white/20 shadow-xl mb-4 ${(!settings.title && !settings.subtitle) ? "w-40 h-40" : "w-24 h-24"}`}>
                            {/* Default Fallback Logo Icon */}
                            <svg width={(!settings.title && !settings.subtitle) ? "64" : "40"} height={(!settings.title && !settings.subtitle) ? "64" : "40"} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4 8 4v14M12 11v10" /></svg>
                        </div>
                    )}
                    {(settings.title || settings.subtitle) && (
                        <div className="space-y-2">
                            {settings.title && (
                                <h1 className="text-3xl font-bold text-white tracking-wide font-serif">
                                    {settings.title}
                                </h1>
                            )}
                            {settings.subtitle && (
                                <p className="text-white/70 text-sm tracking-widest uppercase">
                                    {settings.subtitle}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-4">
                    {settings.instagramUrl && (
                        <a href={settings.instagramUrl} target="_blank" className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-all duration-300">
                            <Instagram className="h-5 w-5" />
                        </a>
                    )}
                    {settings.websiteUrl && (
                        <a href={settings.websiteUrl} target="_blank" className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-all duration-300">
                            <Globe className="h-5 w-5" />
                        </a>
                    )}
                </div>

                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Venue Selection List */}
                <div className="w-full space-y-3">
                    <h2 className="text-white/90 text-sm font-medium mb-4">Lütfen bir mekan seçiniz</h2>

                    {loading ? (
                        <div className="text-white/50 text-sm">Yükleniyor...</div>
                    ) : (
                        <div className="grid gap-3">
                            {venues.map((venue) => (
                                <Link key={venue.id} href={`/${venue.slug}`} className="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-4 flex items-center justify-between hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] hover:border-white/30 hover:shadow-lg hover:shadow-[var(--shadow-color)]" style={{ "--shadow-color": venue.theme.primary + '40' } as React.CSSProperties}>
                                    <div className="flex items-center gap-4 z-10">
                                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden relative border border-white/10 shrink-0">
                                            {(venue as any).logo ? (
                                                <Image src={(venue as any).logo} alt={venue.name} fill className="object-cover" />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-white font-bold text-base">{venue.name}</h3>
                                            <p className="text-white/50 text-xs truncate max-w-[150px]">{venue.description}</p>
                                        </div>
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors text-white">
                                        <ArrowRight className="h-4 w-4" />
                                    </div>

                                    {/* Subtle colored glow based on venue theme */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[var(--glow-color)] opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ "--glow-color": venue.theme.primary } as React.CSSProperties} />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <footer className="absolute bottom-6 text-white/20 text-[10px] uppercase tracking-widest">
                    Powered by QR Menu SaaS
                </footer>
            </div>
        </div>
    );
}
