"use client";

import Image from "next/image";
import { useEffect, useState, use } from "react";
import { Search, Globe, Menu as MenuIcon, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Venue } from "@/data/db";
import { DbService } from "@/services/db-service";
import { AnalyticsService } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { notFound } from "next/navigation";

export default function RestaurantMenuPage({ params }: { params: Promise<{ slug: string }> }) {
    const unwrappedParams = use(params);
    const [venue, setVenue] = useState<Venue | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>("");
    const [isScrolled, setIsScrolled] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadVenue() {
            setLoading(true);
            const data = await DbService.getVenueBySlug(unwrappedParams.slug);
            if (data) {
                setVenue(data);
                if (data.categories.length > 0) {
                    setActiveCategory(data.categories[0].id);
                }

                // Log analytics view
                AnalyticsService.logEvent({
                    eventType: 'view',
                    targetId: data.id,
                    targetType: 'venue',
                    venueId: data.id,
                    timestamp: Date.now(),
                    sessionId: AnalyticsService.trackSession()
                });
            }
            setLoading(false);
        }
        loadVenue();
    }, [unwrappedParams.slug]);

    // Scroll handler
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
            if (!venue) return;

            for (const cat of venue.categories) {
                const element = document.getElementById(cat.id);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    if (rect.top >= 0 && rect.top <= 300) {
                        setActiveCategory(cat.id);
                        break;
                    }
                }
            }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [venue]);


    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center">Yükleniyor...</div>;
    if (!venue) return notFound();

    const scrollToCategory = (catId: string) => {
        const element = document.getElementById(catId);
        if (element) {
            const y = element.getBoundingClientRect().top + window.scrollY - 180;
            window.scrollTo({ top: y, behavior: "smooth" });
            setActiveCategory(catId);
        }
    };

    // Dynamic Theme Styles
    const themeStyles = {
        "--primary": venue.theme.primary,
        "--secondary": venue.theme.secondary,
        "--background": venue.theme.background,
        "--foreground": venue.theme.foreground,
    } as React.CSSProperties;

    return (
        <div style={themeStyles} className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20 font-sans selection:bg-[var(--primary)] selection:text-white">
            {/* Top Navigation Bar */}
            <header
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-300 shadow-sm",
                    isScrolled ? "py-2 bg-[var(--background)]/95 backdrop-blur-md" : "py-4 bg-[var(--background)]"
                )}
            >
                <div className="container mx-auto px-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent text-[var(--foreground)]">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        {/* Logo Text */}
                        <h1 className="text-xl font-bold tracking-tight text-[var(--primary)] uppercase">
                            {venue.name}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative hidden md:block">
                            <input
                                type="text"
                                placeholder="Ara..."
                                className="bg-black/5 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 w-48 text-[var(--foreground)] placeholder:text-[var(--foreground)]/50"
                            />
                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-[var(--foreground)]/50" />
                        </div>
                        <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0 text-[var(--foreground)]">
                            <Globe className="h-5 w-5" />
                        </Button>
                        <Button size="sm" className="bg-[var(--primary)] text-white hover:opacity-90 rounded-full px-6 font-medium border-none shadow-md shadow-[var(--primary)]/20">
                            Giriş
                        </Button>
                    </div>
                </div>

                {/* Categories Bar */}
                <div className="mt-2 border-t border-black/5">
                    <div className="container mx-auto">
                        <div className="flex overflow-x-auto py-3 px-4 gap-4 no-scrollbar items-center">
                            {venue.categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => scrollToCategory(cat.id)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 min-w-[80px] group transition-all",
                                        activeCategory === cat.id ? "opacity-100 scale-105" : "opacity-70 hover:opacity-100"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-16 h-16 rounded-full overflow-hidden border-2 transition-all shadow-sm",
                                            activeCategory === cat.id ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20" : "border-transparent group-hover:border-black/10"
                                        )}
                                    >
                                        {cat.image ? (
                                            <Image
                                                src={cat.image}
                                                alt={cat.name}
                                                width={64}
                                                height={64}
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-black/10 flex items-center justify-center text-[var(--foreground)]">
                                                <MenuIcon className="h-6 w-6" />
                                            </div>
                                        )}

                                    </div>
                                    <span
                                        className={cn(
                                            "text-xs font-medium whitespace-nowrap",
                                            activeCategory === cat.id ? "text-[var(--primary)] font-bold" : "text-[var(--foreground)]/80"
                                        )}
                                    >
                                        {cat.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* Spacer */}
            <div className="h-[180px]" />

            {/* Hero / Banner Area */}
            <div className="container mx-auto px-4 mb-8">
                <div className="rounded-2xl bg-zinc-900 overflow-hidden relative h-48 md:h-64 shadow-xl">
                    {venue.coverImage && (
                        <Image
                            src={venue.coverImage}
                            alt={venue.name}
                            fill
                            className="object-cover opacity-60"
                        />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-6">
                        <h2 className="text-3xl md:text-4xl font-bold mb-2 font-serif">{venue.name}</h2>
                        <p className="text-white/80 max-w-lg">
                            {venue.description}
                        </p>
                    </div>
                </div>
            </div>

            {/* Menu Sections */}
            <main className="container mx-auto px-4 max-w-5xl">
                {venue.categories.map((cat) => {
                    const categoryProducts = venue.products.filter(p =>
                        (p.categoryId === cat.id) && p.isAvailable
                    );

                    if (categoryProducts.length === 0) return null;

                    return (
                        <section key={cat.id} id={cat.id} className="mb-12 scroll-mt-[200px]">
                            <div className="flex items-center gap-4 mb-6">
                                <h3 className="text-2xl font-bold text-[var(--foreground)]">{cat.name}</h3>
                                <div className="h-[1px] flex-1 bg-black/10" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {categoryProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className="group bg-[var(--background)] rounded-xl p-4 border border-black/5 shadow-sm hover:shadow-md transition-all flex gap-4 cursor-pointer relative overflow-hidden"
                                    >
                                        {/* Hover Glow Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/0 to-[var(--primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                        {/* Product Image */}
                                        <div className="relative w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-black/5">
                                            {product.image ? (
                                                <Image
                                                    src={product.image}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-black/20">
                                                    <MenuIcon className="h-8 w-8" />
                                                </div>
                                            )}
                                            {product.isChefRecommendation && (
                                                <div className="absolute top-1 left-1 bg-amber-400 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm shadow-sm flex items-center gap-1">
                                                    ★ Şefin Seçimi
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex flex-col flex-1 justify-between py-1 relative z-10">
                                            <div>
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className="font-bold text-lg text-[var(--foreground)] leading-tight flex items-center gap-2">
                                                        {product.name}
                                                    </h4>
                                                </div>
                                                <p className="text-sm text-[var(--foreground)]/60 mt-2 line-clamp-2 leading-relaxed">
                                                    {product.description}
                                                </p>

                                                {/* Allergens */}
                                                {product.allergens && product.allergens.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {product.allergens.map(a => (
                                                            <span key={a} className="text-[9px] uppercase tracking-wider font-semibold text-[var(--foreground)]/50 border border-black/5 px-1 rounded-sm">
                                                                {a}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                            </div>

                                            <div className="flex items-center justify-between mt-3">
                                                {/* Price Tag with Secondary Color */}
                                                <span className="text-[var(--primary)] font-bold text-lg">
                                                    {product.currency}{product.price}
                                                </span>

                                                <div className="flex gap-2">
                                                    {product.labels?.map((label) => (
                                                        <span key={label} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-black/5 text-[var(--foreground)]/70 rounded-md">
                                                            {label}
                                                        </span>
                                                    ))}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            AnalyticsService.logEvent({
                                                                eventType: 'click',
                                                                targetId: product.id,
                                                                targetType: 'product',
                                                                venueId: venue.id,
                                                                timestamp: Date.now(),
                                                                sessionId: AnalyticsService.trackSession()
                                                            });
                                                        }}
                                                        className="h-8 w-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors"
                                                    >
                                                        <ChevronRight className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </main>
        </div>
    );
}
