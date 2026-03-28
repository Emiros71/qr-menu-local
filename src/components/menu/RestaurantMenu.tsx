"use client";

import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { Search, Globe, Menu as MenuIcon, ChevronRight, ArrowLeft, Check, ArrowUp, CakeSlice, Coffee, Utensils, Pizza, Sandwich, IceCream, Soup, GlassWater, X, Home, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Venue } from "@/data/db";
import { AnalyticsService } from "@/lib/analytics";
import Link from "next/link";
import { Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RestaurantMenuProps {
    venue: Venue;
}

// Helper to get current time (HH:mm:ss) in a specific timezone
const getCurrentTimeInTimezone = (timezone: string): string => {
    try {
        const formatter = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZone: timezone,
            hourCycle: 'h23' // Force 24-hour format
        });
        return formatter.format(new Date());
    } catch (e) {
        console.warn("Invalid timezone fallback to UTC", e);
        // Fallback if timezone string is invalid
        const d = new Date();
        return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:00`;
    }
};

const isTimeInRange = (current: string, start?: string, end?: string): boolean => {
    if (!start && !end) return true; // No restrictions
    if (start && end) {
        if (start < end) {
            // Normal day (e.g. 09:00 - 17:00)
            return current >= start && current <= end;
        } else {
            // Spans midnight (e.g. 20:00 - 04:00)
            return current >= start || current <= end;
        }
    }
    if (start) return current >= start;
    if (end) return current <= end;
    return true;
};

const getDiscountedPrice = (price: number, type?: 'percentage' | 'fixed' | null, amount?: number | null) => {
    if (!type || !amount) return null;
    if (type === 'percentage') return Math.max(0, price - (price * (amount / 100)));
    if (type === 'fixed') return Math.max(0, price - amount);
    return null;
};

const FALLBACK_DEFAULT_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/4/4b/Crowne_Plaza_Hotels_%26_Resorts_logo.svg";

function ProductImage({ src, alt, defaultImage }: { src?: string, alt: string, defaultImage: string }) {
    // Derive imgSrc instead of syncing via useEffect to avoid cascading renders
    const imgSrc = src?.startsWith("http") ? src : defaultImage;

    return (
        <Image
            src={imgSrc}
            alt={alt}
            fill
            className={cn(
                "object-cover transition-transform duration-500 group-hover:scale-110",
                imgSrc === defaultImage ? "object-contain p-1" : ""
            )}
        />
    );
}

import ProductModal from "./ProductModal";

const SubcategoryAccordion = ({ subcat, venueProducts, subCategories, renderProductCard, localize, isAvailable, currentTimeTimezone, searchTerm }: any) => {
    const [isOpen, setIsOpen] = useState(false);

    // Direct products of this subcategory (venueProducts is already pre-filtered by search & availability)
    const directProducts = venueProducts.filter((p: any) =>
        p.categoryId === subcat.id &&
        isTimeInRange(currentTimeTimezone, p.startTime, p.endTime)
    );

    // Direct children categories
    const mySubcats = subCategories.filter((s: any) => s.parentId === subcat.id);

    // Helper to check if any descendant has products
    const hasAnyDescendantProducts = (catId: string): boolean => {
        const hasDirect = venueProducts.some((p: any) => p.categoryId === catId && isTimeInRange(currentTimeTimezone, p.startTime, p.endTime));
        if (hasDirect) return true;
        const children = subCategories.filter((s: any) => s.parentId === catId);
        return children.some((c: any) => hasAnyDescendantProducts(c.id));
    };

    // Filter children to only those that have descendant products
    const activeChildSubcats = mySubcats.filter((c: any) => hasAnyDescendantProducts(c.id));

    if (directProducts.length === 0 && activeChildSubcats.length === 0) return null;

    return (
        <div className={cn("border border-[var(--foreground)]/10 rounded-2xl overflow-hidden mt-4", !isAvailable && "opacity-50 grayscale pointer-events-none")}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full h-14 px-4 flex items-center justify-between bg-[var(--card-color)] hover:bg-[var(--foreground)]/5 transition-colors">
                <span className="font-bold text-lg text-[var(--foreground)] opacity-90">{localize(subcat, 'name')}</span>
                <ChevronDown className={cn("h-5 w-5 text-[var(--foreground)]/60 transition-transform duration-300", isOpen ? "rotate-180" : "")} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-[var(--background)]"
                    >
                        <div className="p-4 pt-4 border-t border-[var(--foreground)]/5">
                            {directProducts.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {directProducts.map((p: any) => renderProductCard(p, subcat.id))}
                                </div>
                            )}

                            {activeChildSubcats.length > 0 && (
                                <div className={cn("space-y-4", directProducts.length > 0 ? "mt-6" : "")}>
                                    {activeChildSubcats.map((childCat: any) => {
                                        const childAvailable = isAvailable && isTimeInRange(currentTimeTimezone, childCat.startTime, childCat.endTime);
                                        return (
                                            <SubcategoryAccordion
                                                key={childCat.id}
                                                subcat={childCat}
                                                venueProducts={venueProducts}
                                                subCategories={subCategories}
                                                renderProductCard={renderProductCard}
                                                localize={localize}
                                                isAvailable={childAvailable}
                                                currentTimeTimezone={currentTimeTimezone}
                                                searchTerm={searchTerm}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ... previous imports

export default function RestaurantMenu({ venue }: RestaurantMenuProps) {
    const defaultAvailableCategories = venue.categories.filter(c => c.isAvailable !== false);
    const [activeCategory, setActiveCategory] = useState<string>(defaultAvailableCategories[0]?.id || "");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_isScrolled, setIsScrolled] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [currentTimeTimezone, setCurrentTimeTimezone] = useState<string>("00:00:00");
    const [showCampaignPopup, setShowCampaignPopup] = useState(false);
    const [currentPopupIndex, setCurrentPopupIndex] = useState(0);

    const activePopups = useMemo(() => {
        return Array.isArray(venue.popup_settings)
            ? venue.popup_settings.filter((p: unknown) => (p as any).isActive) // eslint-disable-line @typescript-eslint/no-explicit-any
            : ((venue.popup_settings as any)?.isActive ? [venue.popup_settings] : []); // eslint-disable-line @typescript-eslint/no-explicit-any
    }, [venue.popup_settings]);

    // --- i18n Logic (Moved to top to prevent hoisting issues) ---
    const supportedLangs = venue.supportedLanguages && venue.supportedLanguages.length > 0 ? venue.supportedLanguages : ['tr'];
    const defaultLang = venue.defaultLanguage || 'tr';
    const [currentLang, setCurrentLang] = useState(defaultLang);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

    useEffect(() => {
        // Detect browser language on mount
        if (typeof navigator !== 'undefined') {
            const browserLang = navigator.language.split('-')[0];
            if (supportedLangs.includes(browserLang) && browserLang !== currentLang) {
                setCurrentLang(browserLang);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supportedLangs]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const localize = (obj: any, field: string) => {
        if (!obj) return "";
        // If current lang is default, return direct field
        if (currentLang === defaultLang) return obj[field];
        // Try translations, fallback to default field
        return obj.translations?.[currentLang]?.[field] || obj[field];
    };

    // Allergen localization helper
    const localizeAllergen = (allergenName: string) => {
        if (currentLang === defaultLang) return allergenName;
        // Find allergen in venue's allergen list (case-insensitive)
        const allergen = venue.allergens?.find(a => a.name.toLowerCase() === allergenName.toLowerCase());
        // Return translation if exists, otherwise return original name
        return allergen?.translations?.[currentLang]?.name || allergenName;
    };

    const activeCategories = useMemo(() => {
        return venue.categories.filter(c => c.isAvailable !== false);
    }, [venue.categories]);

    const topLevelCategories = useMemo(() => activeCategories.filter(c => !c.parentId), [activeCategories]);
    const subCategories = useMemo(() => activeCategories.filter(c => c.parentId), [activeCategories]);

    // PRE-FILTER PRODUCTS BY SEARCH TERM (Optimization for 300+ products)
    const filteredProducts = useMemo(() => {
        if (!searchTerm) return venue.products.filter(p => p.isAvailable);
        const lowerSearch = searchTerm.toLowerCase();
        return venue.products.filter(p =>
            p.isAvailable && (
                localize(p, 'name').toLowerCase().includes(lowerSearch) ||
                localize(p, 'description').toLowerCase().includes(lowerSearch)
            )
        );
    }, [venue.products, searchTerm, currentLang]); // eslint-disable-line react-hooks/exhaustive-deps

    // MAP PRODUCTS TO CATEGORIES ONCE (Huge performance gain)
    const categoryProductMap = useMemo(() => {
        const map: Record<string, any[]> = {};

        filteredProducts.forEach(p => {
            if (!isTimeInRange(currentTimeTimezone, p.startTime, p.endTime)) return;

            if (!map[p.categoryId]) map[p.categoryId] = [];
            map[p.categoryId].push(p);
        });

        return map;
    }, [filteredProducts, currentTimeTimezone]);

    const discountedProducts = useMemo(() => {
        return venue.products.filter(p =>
            p.discount_type && p.discount_amount &&
            p.isAvailable &&
            activeCategories.some(c => c.id === p.categoryId) &&
            isTimeInRange(currentTimeTimezone, p.startTime, p.endTime)
        );
    }, [venue.products, activeCategories, currentTimeTimezone]);

    const nativeCampaignCatIndex = useMemo(() => {
        return topLevelCategories.findIndex(c =>
            (c.name || '').toLowerCase().includes('kampanya') ||
            (c.name || '').toLowerCase().includes('campaign')
        );
    }, [topLevelCategories]);
    const nativeCampaignCatId = nativeCampaignCatIndex > -1 ? topLevelCategories[nativeCampaignCatIndex].id : null;

    useEffect(() => {
        if (activePopups.length > 0) {
            const currentPopup = activePopups[0];
            const hasSeenPopup = sessionStorage.getItem(`seen_popup_${venue.id}_${currentPopup.id}`);

            if (!hasSeenPopup) {
                // Slight delay so it doesn't block immediate render
                const timer = setTimeout(() => {
                    setShowCampaignPopup(true);
                    sessionStorage.setItem(`seen_popup_${venue.id}_${currentPopup.id}`, 'true');

                    AnalyticsService.trackEvent({
                        type: 'VIEW_POPUP',
                        venueId: venue.id,
                        metadata: { popupId: currentPopup.id, title: currentPopup.title }
                    });
                }, 800);
                return () => clearTimeout(timer);
            }
        }
    }, [venue.id, activePopups]);

    const handleNextPopup = () => {
        const currentPopup = activePopups[currentPopupIndex];

        if (currentPopup) {
            AnalyticsService.trackEvent({
                type: 'DISMISS_POPUP',
                venueId: venue.id,
                metadata: { popupId: currentPopup.id, title: currentPopup.title }
            });
        }

        if (currentPopupIndex < activePopups.length - 1) {
            setCurrentPopupIndex(prev => prev + 1);
            const nextPopup = activePopups[currentPopupIndex + 1];
            if (nextPopup) {
                AnalyticsService.trackEvent({
                    type: 'VIEW_POPUP',
                    venueId: venue.id,
                    metadata: { popupId: nextPopup.id, title: nextPopup.title }
                });
            }
        } else {
            setShowCampaignPopup(false);
        }
    };

    const handleExaminePopup = () => {
        const currentPopup = activePopups[currentPopupIndex];

        if (currentPopup) {
            AnalyticsService.trackEvent({
                type: 'CLICK_POPUP',
                venueId: venue.id,
                metadata: { popupId: currentPopup.id, title: currentPopup.title, link: currentPopup.link }
            });
        }

        if (currentPopupIndex < activePopups.length - 1) {
            setCurrentPopupIndex(prev => prev + 1);
            const nextPopup = activePopups[currentPopupIndex + 1];
            if (nextPopup) {
                AnalyticsService.trackEvent({
                    type: 'VIEW_POPUP',
                    venueId: venue.id,
                    metadata: { popupId: nextPopup.id, title: nextPopup.title }
                });
            }
        } else {
            setShowCampaignPopup(false);

            if (currentPopup?.link) {
                if (currentPopup.link.startsWith('http')) {
                    window.location.assign(currentPopup.link);
                    return;
                }

                // Try to find a matching product by name or ID
                const searchTermLower = currentPopup.link.toLowerCase().trim();
                const targetProduct = venue.products.find(p =>
                    p.id === currentPopup.link ||
                    localize(p, 'name').toLowerCase().includes(searchTermLower) ||
                    localize(p, 'description').toLowerCase().includes(searchTermLower)
                );

                if (targetProduct) {
                    setTimeout(() => {
                        setSelectedProduct(targetProduct);
                    }, 300); // give time for popup to close
                    return;
                }
            }

            setTimeout(() => {
                const targetCatId = nativeCampaignCatId || 'campaigns-dynamic-cat';
                const element = document.getElementById(targetCatId);
                if (element) {
                    const headerOffset = 180;
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
                    setActiveCategory(targetCatId);
                } else {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
            }, 100);
        }
    };

    useEffect(() => {
        const checkScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', checkScroll);

        // Setup clock for dynamic menu
        const tz = venue.timezone || 'Europe/Istanbul';
        setCurrentTimeTimezone(getCurrentTimeInTimezone(tz));

        const timer = setInterval(() => {
            setCurrentTimeTimezone(getCurrentTimeInTimezone(tz));
        }, 1000 * 60); // Update every minute to save CPU

        return () => {
            window.removeEventListener('scroll', checkScroll);
            clearInterval(timer);
        }
    }, [venue.timezone]);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    // Get default image from venue theme settings, or use system fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const venueDefaultImage = (venue.theme as any)?.defaultProductImage || FALLBACK_DEFAULT_IMAGE;

    // Track page view on mount
    useEffect(() => {
        AnalyticsService.trackEvent({
            type: 'VIEW_MENU',
            venueId: venue.id,
            metadata: { slug: venue.slug }
        });
    }, [venue.id, venue.slug]);

    const displayCategories = useMemo(() => {
        const cats = [...topLevelCategories];

        if (nativeCampaignCatIndex > 0) {
            const campaignCat = cats.splice(nativeCampaignCatIndex, 1)[0];
            cats.unshift(campaignCat);
        }

        const newNativeIndex = nativeCampaignCatIndex !== -1 ? 0 : -1;

        if (discountedProducts.length > 0 && newNativeIndex === -1) {
            cats.unshift({
                id: 'campaigns-dynamic-cat',
                name: currentLang === 'tr' ? '🔥 Kampanyalar' : '🔥 Campaigns',
                image: null,
                coverImage: null,
                venueId: venue.id,
                translations: {
                    en: { name: '🔥 Campaigns' }
                }
            } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        }
        return cats;
    }, [topLevelCategories, nativeCampaignCatIndex, discountedProducts.length, currentLang, venue.id]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);

            // ScrollSpy Logic
            const sections = displayCategories.map(c => document.getElementById(c.id));
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
    }, [displayCategories]);

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

    // Mobile Scroll To Top Logic
    // ...

    const getCategoryIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('tatlı') || n.includes('pasta') || n.includes('dessert') || n.includes('cake')) return <CakeSlice className="h-7 w-7 text-[var(--foreground)]" />;
        if (n.includes('kahve') || n.includes('coffee') || n.includes('hot') || n.includes('sıcak')) return <Coffee className="h-7 w-7 text-[var(--foreground)]" />;
        if (n.includes('içecek') || n.includes('drink') || n.includes('soft') || n.includes('bar') || n.includes('alkol') || n.includes('smoothie')) return <GlassWater className="h-7 w-7 text-[var(--foreground)]" />; // Need GlassWater or Beer
        if (n.includes('yemek') || n.includes('food') || n.includes('ana') || n.includes('main')) return <Utensils className="h-7 w-7 text-[var(--foreground)]" />;
        if (n.includes('çorba') || n.includes('soup')) return <Soup className="h-7 w-7 text-[var(--foreground)]" />;
        if (n.includes('pizza') || n.includes('lahmacun')) return <Pizza className="h-7 w-7 text-[var(--foreground)]" />;
        if (n.includes('burger') || n.includes('sand')) return <Sandwich className="h-7 w-7 text-[var(--foreground)]" />;
        if (n.includes('dondurma') || n.includes('ice')) return <IceCream className="h-7 w-7 text-[var(--foreground)]" />;
        // Icons are now dark grey because they sit on white/light backgrounds
        if (n.includes('tatlı') || n.includes('pasta') || n.includes('dessert') || n.includes('cake')) return <CakeSlice className="h-7 w-7 text-zinc-700" />;
        if (n.includes('kahve') || n.includes('coffee') || n.includes('hot') || n.includes('sıcak')) return <Coffee className="h-7 w-7 text-zinc-700" />;
        if (n.includes('içecek') || n.includes('drink') || n.includes('soft') || n.includes('bar') || n.includes('alkol') || n.includes('smoothie')) return <GlassWater className="h-7 w-7 text-zinc-700" />;
        if (n.includes('yemek') || n.includes('food') || n.includes('ana') || n.includes('main')) return <Utensils className="h-7 w-7 text-zinc-700" />;
        if (n.includes('çorba') || n.includes('soup')) return <Soup className="h-7 w-7 text-zinc-700" />;
        if (n.includes('pizza') || n.includes('lahmacun')) return <Pizza className="h-7 w-7 text-zinc-700" />;
        if (n.includes('burger') || n.includes('sand')) return <Sandwich className="h-7 w-7 text-zinc-700" />;
        if (n.includes('dondurma') || n.includes('ice')) return <IceCream className="h-7 w-7 text-zinc-700" />;
        return <MenuIcon className="h-7 w-7 text-zinc-700" />;
    };

    const renderProductCard = (product: any, catId: string) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const cardStyle = (venue.theme as any)?.cardStyle || 'modern'; // eslint-disable-line @typescript-eslint/no-explicit-any
        let cardClassName = "relative flex flex-col gap-3 p-3 rounded-2xl transition-all duration-300 group overflow-hidden cursor-pointer ";

        if (cardStyle === 'minimal') cardClassName += "bg-[var(--card-color)] hover:shadow-sm";
        else if (cardStyle === 'bordered') cardClassName += "bg-[var(--card-color)] border border-[var(--foreground)]/10";
        else if (cardStyle === 'glass') cardClassName += "bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/20";
        else cardClassName += "bg-[var(--card-color)] shadow-sm hover:shadow-md border border-[var(--foreground)]/5";

        return (
            <div
                key={`${catId}-${product.id}`}
                className={cn(cardClassName, "animate-in fade-in slide-in-from-bottom-2 duration-500")}
                onClick={(e) => {
                    e.stopPropagation();
                    AnalyticsService.trackEvent({
                        type: 'CLICK_PRODUCT',
                        venueId: venue.id,
                        productId: product.id,
                        metadata: { productName: product.name }
                    });
                    setSelectedProduct(product);
                }}
            >
                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/0 to-[var(--primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="flex gap-4 items-start">
                    {/* Product Image */}
                    <div className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden bg-black/20 shadow-inner">
                        <ProductImage src={product.image} alt={localize(product, 'name')} defaultImage={venueDefaultImage} />
                        {product.isChefRecommendation && (
                            <div className="absolute top-0 left-0 bg-[var(--label-color)] text-white text-[9px] uppercase font-bold px-2 py-1 rounded-br-lg shadow-sm z-10">
                                ★
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1 gap-1 relative z-10">
                        <div className="flex-1">
                            <div className="flex justify-between items-start gap-2">
                                <h4 className="font-bold text-base text-[var(--foreground)] leading-tight group-hover:text-[var(--primary)] transition-colors">
                                    {localize(product, 'name')}
                                </h4>
                            </div>
                            <p className="text-sm text-[var(--foreground)]/60 line-clamp-2 leading-relaxed mt-0.5">
                                {localize(product, 'description')}
                            </p>

                            {/* Allergens */}
                            {product.allergens && product.allergens.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {product.allergens.slice(0, 3).map((allergen: string) => (
                                        <span key={allergen} className="text-[9px] font-medium px-1 py-0.5 bg-white/5 text-zinc-400 rounded border border-white/10">
                                            {localizeAllergen(allergen)}
                                        </span>
                                    ))}
                                    {product.allergens.length > 3 && <span className="text-[9px] text-zinc-500">...</span>}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-1">
                            <div className="flex flex-col">
                                {product.discount_type && product.discount_amount ? (
                                    <>
                                        <span className="text-[10px] text-[var(--foreground)]/50 line-through">
                                            ₺{product.price}
                                        </span>
                                        <span className="font-bold text-base text-[var(--primary)] flex items-center gap-1.5">
                                            ₺{getDiscountedPrice(product.price, product.discount_type, product.discount_amount)?.toFixed(2).replace(/\.00$/, '')}
                                            <span className="text-[9px] bg-red-500 text-white px-1 py-0.5 rounded-full">
                                                {product.discount_type === 'percentage' ? `%${product.discount_amount}` : `-${product.discount_amount}₺`}
                                            </span>
                                        </span>
                                    </>
                                ) : (
                                    <span className="font-bold text-base text-[var(--primary)]">
                                        ₺{product.price}
                                    </span>
                                )}
                            </div>
                            <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[var(--foreground)] group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                                <ChevronRight className="h-4 w-4" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const themeStyles = venue.theme ? {
        '--background': venue.theme.background,
        '--foreground': venue.theme.foreground,
        '--primary': venue.theme.primary,
        '--secondary': venue.theme.secondary,
        '--header-color': venue.theme.headerColor || (venue.theme.background === '#000000' ? '#000000' : 'rgba(255, 255, 255, 0.95)'),
        '--label-color': venue.theme.labelColor || '#fbbf24',
        '--card-color': venue.theme.cardColor || `rgba(${venue.theme.foreground === '#ffffff' || venue.theme.foreground === '#F8FAFC' ? '255,255,255,0.05' : '0,0,0,0.03'})`,
    } as React.CSSProperties : {};

    return (
        <div className="min-h-screen bg-[var(--background)] pb-20 transition-colors duration-300" style={themeStyles}>

            {/* Navbar (Transparent Absolute) */}
            <header className="absolute top-0 left-0 right-0 z-50 p-4 transition-all pt-6">
                <div className="container mx-auto flex items-center justify-between text-white">
                    {/* Back Button */}
                    <Link href="/" className="md:hidden p-2.5 bg-black/30 text-white hover:bg-black/50 rounded-full backdrop-blur-md transition-all border border-white/10">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>

                    <div className="flex-1"></div>

                    {/* Language Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/20 transition-colors text-white text-sm font-bold shadow-lg"
                        >
                            <Globe className="h-4 w-4 text-white/90" />
                            <span>{currentLang.toUpperCase()}</span>
                        </button>

                        {isLangMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)} />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl py-2 z-50 border border-zinc-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="px-4 py-2 text-xs font-semibold text-zinc-400 border-b border-zinc-50 mb-1">
                                        DİL SEÇİNİZ
                                    </div>
                                    {supportedLangs.map(code => (
                                        <button
                                            key={code}
                                            onClick={() => {
                                                setCurrentLang(code);
                                                setIsLangMenuOpen(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-3 text-sm hover:bg-zinc-50 flex items-center justify-between transition-colors text-zinc-800",
                                                currentLang === code ? "text-primary font-bold bg-primary/5" : "text-zinc-700 font-medium"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl leading-none shadow-sm rounded-sm overflow-hidden">
                                                    {code === 'tr' ? '🇹🇷' : code === 'en' ? '🇬🇧' : code === 'de' ? '🇩🇪' : code === 'fr' ? '🇫🇷' : code === 'ru' ? '🇷🇺' : code === 'ar' ? '🇸🇦' : '🏳️'}
                                                </span>
                                                <span>{code === 'tr' ? 'Türkçe' : code === 'en' ? 'English' : code === 'de' ? 'Deutsch' : code === 'fr' ? 'Français' : code === 'ru' ? 'Русский' : code === 'ar' ? 'العربية' : code.toUpperCase()}</span>
                                            </div>
                                            {currentLang === code && <Check className="h-4 w-4 text-primary" />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>


            {/* Hero / Banner Area (Centered Text Overlay) */}
            <div className="relative w-full h-[300px] md:h-[400px] bg-zinc-900 shadow-2xl">
                {venue.coverImage && (
                    <Image
                        src={venue.coverImage}
                        alt={venue.name}
                        fill
                        className="object-cover opacity-90"
                    />
                )}
                {/* Dark Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10 mt-8"
                >
                    {venue.theme?.showLogoInMenu === true && (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
                            className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-sm p-[2px] shadow-2xl ring-1 ring-white/20 mb-4 flex items-center justify-center z-10"
                        >
                            <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-[#4b4b4b]">
                                {venue.logo ? (
                                    <Image src={venue.logo} alt="Logo" fill className="object-cover" />
                                ) : (
                                    <Home className="w-8 h-8 text-white stroke-[1.5]" />
                                )}
                            </div>
                        </motion.div>
                    )}
                    <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)] tracking-tight mb-2">
                        {venue.name}
                    </h1>
                    {venue.theme?.showDescriptionInMenu !== false && venue.description && (
                        <p className="text-white/80 text-sm md:text-lg max-w-lg font-medium drop-shadow-md leading-relaxed px-4">
                            {venue.description}
                        </p>
                    )}
                </motion.div>
            </div>

            {/* Sticky Search & Categories Bar */}
            <div className="sticky top-0 z-40 bg-[var(--header-color)] shadow-sm border-b border-white/5 transition-all backdrop-blur-md">
                <div className="container mx-auto px-4 py-3">
                    {/* Search Input */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder={currentLang === 'tr' ? 'Menüde ara...' : 'Search menu...'}
                            className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-100 border-none focus:bg-white text-zinc-800 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all shadow-inner placeholder:text-zinc-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Categories */}
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide py-2 pb-4 -mx-4 px-4 snap-x">
                        {displayCategories.map((cat) => {
                            const available = isTimeInRange(currentTimeTimezone, cat.startTime, cat.endTime);
                            if (!available) return null;
                            return (
                                <button
                                    key={cat.id}
                                    id={`btn-${cat.id}`}
                                    onClick={() => available ? scrollToCategory(cat.id) : null}
                                    className={cn(
                                        "flex flex-col items-center gap-2 group min-w-[80px] w-[88px] shrink-0 snap-start",
                                        available ? "cursor-pointer" : "cursor-not-allowed opacity-50 grayscale"
                                    )}
                                >
                                    <div className={cn(
                                        "w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all relative flex items-center justify-center shrink-0",
                                        available ? "shadow-sm group-hover:shadow-md" : "",
                                        activeCategory === cat.id && available
                                            ? "border-[var(--primary)] scale-105 shadow-md shadow-[var(--primary)]/20 bg-white"
                                            : "border-transparent bg-zinc-100 grayscale-[0.3] group-hover:grayscale-0"
                                    )}>
                                        {cat.image ? (
                                            <Image src={cat.image} alt={cat.name} fill className="object-cover" />
                                        ) : (
                                            <div className={cn("transition-colors opacity-90", activeCategory === cat.id ? "text-[var(--primary)]" : "text-zinc-700")}>
                                                {getCategoryIcon(localize(cat, 'name'))}
                                            </div>
                                        )}
                                        {!available && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                                                <Clock className="w-6 h-6 text-white drop-shadow-md" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center w-full px-1">
                                        <span
                                            className={cn(
                                                "text-[10px] leading-snug font-bold text-center line-clamp-2 px-1.5 py-1 rounded-[8px] transition-colors w-full break-words",
                                                activeCategory === cat.id && available
                                                    ? "text-white bg-[var(--primary)] shadow-sm"
                                                    : "text-zinc-500 group-hover:text-zinc-900"
                                            )}
                                            title={localize(cat, 'name')}
                                        >
                                            {localize(cat, 'name')}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Menu Sections */}
            <main className="container mx-auto px-4 max-w-5xl mt-6 relative min-h-[50vh]">
                <AnimatePresence>
                    {displayCategories.map((cat, index) => {
                        const available = isTimeInRange(currentTimeTimezone, cat.startTime, cat.endTime);
                        if (!available) return null;

                        const isNativeCampaigns = (nativeCampaignCatIndex !== -1 ? 0 : -1) === index;

                        const categoryProducts = cat.id === 'campaigns-dynamic-cat'
                            ? discountedProducts.filter(p => (searchTerm === "" || localize(p, 'name').toLowerCase().includes(searchTerm.toLowerCase()) || localize(p, 'description').toLowerCase().includes(searchTerm.toLowerCase())))
                            : (categoryProductMap[cat.id] || []).filter(p =>
                                isNativeCampaigns ? !discountedProducts.some(dp => dp.id === p.id) : true
                            );

                        // If it's the "Campaigns" section (native or dynamic), make sure it includes campaign products
                        if (isNativeCampaigns) {
                            discountedProducts.forEach(dp => {
                                if (!categoryProducts.some(existingP => existingP.id === dp.id)) {
                                    categoryProducts.push(dp);
                                }
                            });
                        }

                        const relatedSubcats = subCategories.filter(s => s.parentId === cat.id);

                        // If no products and no subcategories, skip
                        // Helper to check for subcategory trees
                        const hasProductsInTree = (catId: string): boolean => {
                            const hasDirect = filteredProducts.some((p: any) => p.categoryId === catId && isTimeInRange(currentTimeTimezone, p.startTime, p.endTime));
                            if (hasDirect) return true;
                            const children = subCategories.filter((s: any) => s.parentId === catId);
                            return children.some((c: any) => hasProductsInTree(c.id));
                        };

                        const hasAnyValidSubcat = relatedSubcats.some(s => hasProductsInTree(s.id));

                        if (categoryProducts.length === 0 && !hasAnyValidSubcat) return null;

                        return (
                            <section key={cat.id} id={cat.id} className={cn("mb-12 scroll-mt-[200px]", !available && "opacity-50 pointer-events-none grayscale")}>
                                {(cat as any).coverImage && ( // eslint-disable-line @typescript-eslint/no-explicit-any
                                    <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-6 shadow-md">
                                        <Image
                                            src={(cat as any).coverImage as string} // eslint-disable-line @typescript-eslint/no-explicit-any
                                            alt={localize(cat, 'name')}
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60" />
                                        {!available && (
                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
                                                <Clock className="w-12 h-12 mb-3 text-white/50" />
                                                <h4 className="text-xl font-bold mb-1">Şu An Servis Dışı</h4>
                                                <p className="text-white/80 text-sm">Bu menü servis saatleri dışındadır. ({cat.startTime?.substring(0, 5)} - {cat.endTime?.substring(0, 5)})</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center justify-between mb-6 pl-1">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_15px_var(--primary)]" />
                                        <h3 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
                                            {localize(cat, 'name')}
                                        </h3>
                                    </div>
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {!available && !(cat as any).coverImage && (
                                        <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/20">
                                            <Clock className="w-3.5 h-3.5" /> Servis Dışı
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {categoryProducts.map((product) => renderProductCard(product, cat.id))}
                                </div>

                                {relatedSubcats.length > 0 && (() => {
                                    // Helper to check if a category tree has any products matching filters
                                    const hasAnyDescendantProductsMenu = (catId: string): boolean => {
                                        const hasDirect = filteredProducts.some((p: any) => p.categoryId === catId && isTimeInRange(currentTimeTimezone, p.startTime, p.endTime));
                                        if (hasDirect) return true;
                                        const children = subCategories.filter((s: any) => s.parentId === catId);
                                        return children.some((c: any) => hasAnyDescendantProductsMenu(c.id));
                                    };

                                    const activeRelatedSubcats = relatedSubcats.filter(subcat => hasAnyDescendantProductsMenu(subcat.id));

                                    if (activeRelatedSubcats.length === 0) return null;

                                    return (
                                        <div className="mt-8 space-y-4">
                                            {activeRelatedSubcats.map(subcat => {
                                                const subAvailable = available && isTimeInRange(currentTimeTimezone, subcat.startTime, subcat.endTime);
                                                return (
                                                    <SubcategoryAccordion
                                                        key={subcat.id}
                                                        subcat={subcat}
                                                        venueProducts={filteredProducts}
                                                        subCategories={subCategories}
                                                        renderProductCard={renderProductCard}
                                                        localize={localize}
                                                        isAvailable={subAvailable}
                                                        currentTimeTimezone={currentTimeTimezone}
                                                        searchTerm={searchTerm}
                                                    />
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </section>
                        );
                    })}
                </AnimatePresence>

                {/* Empty State / No Results */}
                {filteredProducts.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center p-12 text-center"
                    >
                        <div className="w-24 h-24 mb-6 rounded-full bg-zinc-100 flex items-center justify-center shadow-inner">
                            <Search className="h-10 w-10 text-zinc-400" />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Ürün Bulunamadı</h3>
                        <p className="text-sm text-[var(--foreground)]/60 max-w-sm">
                            &quot;{searchTerm}&quot; aramasıyla eşleşen herhangi bir ürün veya kategori bulamadık. Lütfen farklı kelimelerle tekrar deneyin.
                        </p>
                        <button
                            onClick={() => setSearchTerm("")}
                            className="mt-6 px-6 py-2 bg-[var(--primary)] text-white rounded-full font-medium active:scale-95 transition-all shadow-sm"
                        >
                            Aramayı Temizle
                        </button>
                    </motion.div>
                )}
            </main>

            {/* Scroll To Top Button */}
            <button
                onClick={scrollToTop}
                className={cn(
                    "fixed bottom-6 right-6 z-40 bg-[var(--primary)] text-white p-3 rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center",
                    showScrollTop ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
                )}
            >
                <ArrowUp className="h-5 w-5" />
            </button>

            {/* Product Detail Modal */}
            <ProductModal
                product={selectedProduct}
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                localize={localize}
                localizeAllergen={localizeAllergen}
                defaultImage={venueDefaultImage}
            />

            {/* Campaign Pop-up Modal */}
            <AnimatePresence>
                {showCampaignPopup && activePopups.length > 0 && activePopups[currentPopupIndex] && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={handleNextPopup}
                        />
                        <motion.div
                            key={currentPopupIndex}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
                        >
                            <button
                                onClick={handleNextPopup}
                                className="absolute top-3 right-3 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            {activePopups[currentPopupIndex].image && (
                                <div className="relative w-full h-48 sm:h-56 bg-zinc-100">
                                    <Image src={activePopups[currentPopupIndex].image} alt={activePopups[currentPopupIndex].title || 'Kampanya'} fill className="object-cover cursor-pointer" onClick={handleNextPopup} />
                                </div>
                            )}

                            <div className="p-6 text-center">
                                {activePopups[currentPopupIndex].title && (
                                    <h3 className="text-2xl font-bold text-zinc-900 mb-3">{activePopups[currentPopupIndex].title}</h3>
                                )}
                                {activePopups[currentPopupIndex].content && (
                                    <p className="text-zinc-600 mb-6 leading-relaxed whitespace-pre-wrap text-sm">{activePopups[currentPopupIndex].content}</p>
                                )}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleExaminePopup}
                                        className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:opacity-90 transition-opacity shadow-md"
                                    >
                                        {currentPopupIndex < activePopups.length - 1 ? 'Sonraki Fırsat' : 'İncele'}
                                    </button>
                                </div>
                                {activePopups.length > 1 && (
                                    <div className="flex justify-center gap-1.5 mt-4">
                                        {activePopups.map((_: unknown, idx: number) => (
                                            <div key={idx} className={cn("w-1.5 h-1.5 rounded-full transition-colors", idx === currentPopupIndex ? "bg-[var(--primary)]" : "bg-zinc-200")} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
