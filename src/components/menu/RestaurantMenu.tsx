"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Search, Globe, Menu as MenuIcon, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Venue } from "@/data/db";
import { AnalyticsService } from "@/lib/analytics";
import Link from "next/link";

interface RestaurantMenuProps {
    venue: Venue;
}

const FALLBACK_DEFAULT_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/4/4b/Crowne_Plaza_Hotels_%26_Resorts_logo.svg";

function ProductImage({ src, alt, defaultImage }: { src?: string, alt: string, defaultImage: string }) {
    const [imgSrc, setImgSrc] = useState(src || defaultImage);

    useEffect(() => {
        setImgSrc(src?.startsWith("http") ? src : defaultImage);
    }, [src, defaultImage]);

    return (
        <Image
            src={imgSrc}
            alt={alt}
            fill
            className={cn(
                "object-cover transition-transform duration-500 group-hover:scale-110",
                imgSrc === defaultImage ? "object-contain p-1" : ""
            )}
            onError={() => setImgSrc(defaultImage)}
        />
    );
}

export default function RestaurantMenu({ venue }: RestaurantMenuProps) {
    const [activeCategory, setActiveCategory] = useState<string>(venue.categories[0]?.id || "");
    const [isScrolled, setIsScrolled] = useState(false);

    // Get default image from venue theme settings, or use system fallback
    const venueDefaultImage = (venue.theme as any)?.defaultProductImage || FALLBACK_DEFAULT_IMAGE;

    // --- i18n Logic ---
    const supportedLangs = venue.supportedLanguages && venue.supportedLanguages.length > 0 ? venue.supportedLanguages : ['tr'];
    const defaultLang = venue.defaultLanguage || 'tr';
    const [currentLang, setCurrentLang] = useState(defaultLang);

    useEffect(() => {
        // Detect browser language on mount
        if (typeof navigator !== 'undefined') {
            const browserLang = navigator.language.split('-')[0];
            if (supportedLangs.includes(browserLang) && browserLang !== currentLang) {
                setCurrentLang(browserLang);
            }
        }
    }, [supportedLangs]);

    const localize = (obj: any, field: string) => {
        if (!obj) return "";
        // If current lang is default, return direct field
        if (currentLang === defaultLang) return obj[field];
        // Try translations, fallback to default field
        return obj.translations?.[currentLang]?.[field] || obj[field];
    };

    useEffect(() => {
        // Track page view on mount
        AnalyticsService.trackEvent({
            type: 'VIEW_MENU',
            venueId: venue.id,
            metadata: { slug: venue.slug }
        });
    }, [venue.id, venue.slug]);


    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);

            // ScrollSpy Logic
            const sections = venue.categories.map(c => document.getElementById(c.id));
            const scrollPosition = window.scrollY + 250; // Offset for header

            for (const section of sections) {
                if (section) {
                    const top = section.offsetTop;
                    const height = section.offsetHeight;

                    if (scrollPosition >= top && scrollPosition < top + height) {
                        setActiveCategory(section.id);
                        break;
                    }
                }
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [venue.categories]);

    const scrollToCategory = (categoryId: string) => {
        const element = document.getElementById(categoryId);
        if (element) {
            const headerOffset = 180;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
            setActiveCategory(categoryId);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] pb-20" style={venue.theme as any}>

            {/* Sticky Header */}
            <header
                className={cn(
                    "fixed top-0 left-0 right-0 z-40 transition-all duration-300 transform",
                    isScrolled
                        ? "bg-[var(--background)] shadow-md translate-y-0"
                        : "bg-transparent translate-y-0"
                )}
            >
                {/* Top Bar */}
                <div className={cn(
                    "container mx-auto px-4 py-3 flex items-center justify-between transition-all",
                    isScrolled ? "text-[var(--foreground)]" : "text-white" // White text when on top of hero image
                )}>
                    {/* Back to Home Logic */}
                    <Link href="/" className="md:hidden">
                        <ArrowLeft className="h-6 w-6 opacity-80" />
                    </Link>

                    <div className="flex-1 text-center md:text-left md:ml-4">
                        <h1 className={cn("font-bold text-lg transition-opacity", isScrolled ? "opacity-100" : "opacity-0 md:opacity-100")}>
                            {venue.name}
                        </h1>
                    </div>

                    <div className="flex gap-3">
                        <button className="p-2 rounded-full bg-black/10 backdrop-blur-md hover:bg-black/20 transition-colors">
                            <Search className="h-5 w-5" />
                        </button>
                        <button className="p-2 rounded-full bg-black/10 backdrop-blur-md hover:bg-black/20 transition-colors">
                            <Globe className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Categories Scroll (Sticky below header) */}
                <div className={cn(
                    "w-full overflow-x-auto scrollbar-hide bg-[var(--background)]/95 backdrop-blur-sm border-b border-black/5 transition-all",
                    isScrolled ? "py-2" : "py-4 bg-transparent border-transparent backdrop-blur-none"
                )}>
                    <div className="container mx-auto px-4">
                        <div className="flex gap-4 min-w-max">
                            {venue.categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => scrollToCategory(cat.id)}
                                    className="flex flex-col items-center gap-2 group min-w-[70px] cursor-pointer"
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
                    {/* Header Content */}
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white text-center p-6 bg-black/20">
                        {venue.logo && (
                            <div className="w-24 h-24 rounded-full bg-white p-2 mb-4 shadow-lg shrink-0">
                                <Image src={venue.logo} alt="Logo" width={96} height={96} className="w-full h-full object-contain" />
                            </div>
                        )}
                        <h1 className="text-4xl font-bold mb-2 drop-shadow-md tracking-tight">{venue.name}</h1>
                        <p className="text-white/90 text-sm max-w-md drop-shadow font-medium">{venue.description}</p>

                        {/* Language Selector */}
                        {supportedLangs.length > 1 && (
                            <div className="absolute top-4 right-4 z-50">
                                <div className="relative">
                                    <select
                                        value={currentLang}
                                        onChange={(e) => setCurrentLang(e.target.value)}
                                        className="appearance-none bg-black/30 backdrop-blur-md text-white border border-white/20 rounded-full py-1.5 pl-8 pr-4 text-xs font-bold focus:outline-none cursor-pointer hover:bg-black/40 transition-colors uppercase"
                                    >
                                        {supportedLangs.map(l => (
                                            <option key={l} value={l} className="text-black bg-white">{l.toUpperCase()}</option>
                                        ))}
                                    </select>
                                    <Globe className="absolute left-2.5 top-1/5 -translate-y-[1px] mt-2 h-3.5 w-3.5 text-white pointer-events-none" />
                                </div>
                            </div>
                        )}
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
                                <h3 className="text-2xl font-bold text-[var(--foreground)]">{localize(cat, 'name')}</h3>
                                <div className="h-[1px] flex-1 bg-black/10" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {categoryProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className="group bg-[var(--background)] rounded-xl p-4 border border-black/5 shadow-sm hover:shadow-md transition-all flex gap-4 cursor-pointer relative overflow-hidden"
                                        onClick={() => {
                                            AnalyticsService.trackEvent({
                                                type: 'CLICK_PRODUCT',
                                                venueId: venue.id,
                                                productId: product.id,
                                                metadata: { productName: product.name }
                                            });
                                        }}
                                    >
                                        {/* Hover Glow Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/0 to-[var(--primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                        {/* Product Image */}
                                        <div className="relative w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-black/5">
                                            <ProductImage src={product.image} alt={localize(product, 'name')} defaultImage={venueDefaultImage} />
                                            {product.isChefRecommendation && (
                                                <div className="absolute top-1 left-1 bg-amber-400 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm shadow-sm flex items-center gap-1">
                                                    ★ {currentLang === 'tr' ? 'Şefin Seçimi' : 'Chef\'s Choice'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex flex-col flex-1 justify-between py-1 relative z-10">
                                            <div>
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className="font-bold text-lg text-[var(--foreground)] leading-tight flex items-center gap-2">
                                                        {localize(product, 'name')}
                                                    </h4>
                                                </div>
                                                <p className="text-sm text-[var(--foreground)]/70 line-clamp-2 leading-relaxed">
                                                    {localize(product, 'description')}
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
                                                <span className="font-bold text-lg text-[var(--primary)] bg-[var(--primary)]/5 px-2 py-0.5 rounded-md">
                                                    ₺{product.price}
                                                </span>
                                                <button className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white transition-colors">
                                                    <ChevronRight className="h-5 w-5" />
                                                </button>
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
