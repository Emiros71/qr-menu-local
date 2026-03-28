"use client";

import { use, useState, useEffect, useMemo } from "react";
import { Venue, Product, Category, Allergen } from "@/data/db";
import { VenueService } from "@/services/venue-service";
import { CategoryService } from "@/services/category-service";
import { ProductService } from "@/services/product-service";
import { AllergenService } from "@/services/allergen-service";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { ArrowLeft, ArrowUp, ArrowDown, Plus, Save, Search as SearchIcon, Trash2, Edit2, Check, X, Star, Image as LucideImage, Globe, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Filter, RotateCcw } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { AllergenManager } from "@/components/admin/AllergenManager";

const ProductImporter = dynamic(() => import("@/components/admin/ProductImporter"), {
    ssr: false,
    loading: () => <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ALLERGENS_LIST = [
    "Gluten", "Yumurta", "Süt", "Hardal", "Yer Fıstığı", "Soya", "Balık", "Kabuklu Deniz Ürünleri", "Kereviz"
];

const AVAILABLE_LANGUAGES = [
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

const AdminProductImage = ({ product, defaultImage, onClick }: { product: Product, defaultImage?: string, onClick: () => void }) => {
    const [imgState, setImgState] = useState({ src: product.image || defaultImage, hasError: false, productImg: product.image, defImg: defaultImage });

    if (imgState.productImg !== product.image || imgState.defImg !== defaultImage) {
        setImgState({ src: product.image || defaultImage, hasError: false, productImg: product.image, defImg: defaultImage });
    }

    const { src, hasError } = imgState;

    return (
        <div
            className="h-24 w-24 min-w-[96px] rounded-lg bg-zinc-100 relative overflow-hidden border border-zinc-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group-hover:scale-105"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            title="Görseli düzenlemek için tıkla"
        >
            {src && !hasError ? (
                <Image
                    src={src}
                    alt={product.name}
                    fill
                    className={cn("object-cover", src === defaultImage ? "object-contain p-2 bg-white opacity-80" : "")}
                    onError={() => {
                        if (src !== defaultImage && defaultImage) {
                            setImgState(prev => ({ ...prev, src: defaultImage }));
                        } else {
                            setImgState(prev => ({ ...prev, hasError: true }));
                        }
                    }}
                />
            ) : (
                <LucideImage className="h-8 w-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-300" />
            )}
        </div>
    );
};

const THEME_PRESETS = [
    {
        name: "Aura (Kraliyet Laciverti)",
        colors: {
            primary: "#1A3673",
            secondary: "#F8FAFC",
            background: "#FFFFFF",
            foreground: "#0F172A",
            headerColor: "#FFFFFF",
            labelColor: "#1A3673",
            cardColor: "#F4F6F8",
            cardStyle: 'modern'
        }
    },
    {
        name: "One Bar (Minimal Siyah)",
        colors: {
            primary: "#000000",
            secondary: "#F3F4F6",
            background: "#FFFFFF",
            foreground: "#18181B",
            headerColor: "#FFFFFF",
            labelColor: "#000000",
            cardColor: "#FAFAFA",
            cardStyle: 'minimal'
        }
    },
    {
        name: "The Cafe (Orman Yeşili)",
        colors: {
            primary: "#115E26",
            secondary: "#F0FDF4",
            background: "#FFFFFF",
            foreground: "#064E3B",
            headerColor: "#FFFFFF",
            labelColor: "#115E26",
            cardColor: "#F7FBF7",
            cardStyle: 'bordered'
        }
    },
    {
        name: "Lüks Karanlık (Klasik)",
        colors: {
            primary: "#D4AF37",
            secondary: "#27272a",
            background: "#121212",
            foreground: "#EDEDED",
            headerColor: "#121212",
            labelColor: "#D4AF37",
            cardColor: "#1E1E1E",
            cardStyle: 'modern'
        }
    }
];

export default function VenueEditor({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const unwrappedParams = use(params);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Data States
    const [venueData, setVenueData] = useState<Venue | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [allergens, setAllergens] = useState<Allergen[]>([]);

    // Dirty State (Track changes)
    const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
    const [unsavedCategoryChanges, setUnsavedCategoryChanges] = useState<Set<string>>(new Set());
    const [venueSettingsChanged, setVenueSettingsChanged] = useState(false);

    // UI States
    const [activeTab, setActiveTab] = useState('menu');
    const [modalTab, setModalTab] = useState<'general' | 'translations'>('general');

    // Pagination & Filtering
    const ITEMS_PER_PAGE = 20;
    const [currentPage, setCurrentPage] = useState(1);
    const [filterCategory, setFilterCategory] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [filterChef, setFilterChef] = useState(false);
    const [filterDiscount, setFilterDiscount] = useState(false);

    // Allergen Management
    const [isAddingAllergen, setIsAddingAllergen] = useState(false);
    const [newAllergen, setNewAllergen] = useState("");

    const [isAllergenModalOpen, setIsAllergenModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

    // Helper: get depth of a category in tree
    const getCategoryDepth = (catId: string | null | undefined, cats: Category[]): number => {
        if (!catId) return 0;
        const cat = cats.find(c => c.id === catId);
        if (!cat || !cat.parentId) return 0;
        return 1 + getCategoryDepth(cat.parentId, cats);
    };

    // Helper: get breadcrumb path for a category
    const getCategoryBreadcrumb = (catId: string, cats: Category[]): string => {
        const cat = cats.find(c => c.id === catId);
        if (!cat) return '';
        if (!cat.parentId) return cat.name;
        return getCategoryBreadcrumb(cat.parentId, cats) + ' > ' + cat.name;
    };

    // Helper: sort categories in tree order (parent then children recursively)
    const sortCategoriesTree = (cats: Category[]): Category[] => {
        const result: Category[] = [];
        const addChildren = (parentId: string | null) => {
            cats.filter(c => (c.parentId || null) === parentId).forEach(c => {
                result.push(c);
                addChildren(c.id);
            });
        };
        addChildren(null);
        return result;
    };

    // Helper: check if selecting parentId would create a circular reference
    const wouldCreateCircle = (catId: string, parentId: string, cats: Category[]): boolean => {
        if (catId === parentId) return true;
        let current = parentId;
        const visited = new Set<string>();
        while (current) {
            if (visited.has(current)) return true;
            visited.add(current);
            const cat = cats.find(c => c.id === current);
            if (!cat?.parentId) break;
            if (cat.parentId === catId) return true;
            current = cat.parentId;
        }
        return false;
    };

    // Filtered & paginated products
    const filteredProducts = useMemo(() => {
        let result = [...products];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            // Find categories whose name matches the search
            const matchingCatIds = new Set<string>();
            categories.forEach(c => {
                if (c.name.toLowerCase().includes(q)) matchingCatIds.add(c.id);
            });
            result = result.filter(p => p.name.toLowerCase().includes(q) || matchingCatIds.has(p.categoryId));
        }
        if (filterCategory) {
            // Include products from selected category AND its subcategories
            const getDescendantIds = (parentId: string): string[] => {
                const children = categories.filter(c => c.parentId === parentId);
                return [parentId, ...children.flatMap(c => getDescendantIds(c.id))];
            };
            const catIds = getDescendantIds(filterCategory);
            result = result.filter(p => catIds.includes(p.categoryId));
        }
        if (filterStatus === 'active') result = result.filter(p => p.isAvailable);
        if (filterStatus === 'inactive') result = result.filter(p => !p.isAvailable);
        if (filterChef) result = result.filter(p => p.isChefRecommendation);
        if (filterDiscount) result = result.filter(p => p.discount_type && p.discount_amount);
        return result;
    }, [products, searchQuery, filterCategory, filterStatus, filterChef, filterDiscount, categories]);

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredProducts, currentPage]);

    // Reset page when filters change
    useEffect(() => { setCurrentPage(1); }, [searchQuery, filterCategory, filterStatus, filterChef, filterDiscount]);

    const hasActiveFilters = filterCategory || filterStatus !== 'all' || filterChef || filterDiscount;
    const resetFilters = () => { setFilterCategory(''); setFilterStatus('all'); setFilterChef(false); setFilterDiscount(false); setSearchQuery(''); };

    const treeSortedCategories = useMemo(() => sortCategoriesTree(categories), [categories]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load Data
    useEffect(() => {
        async function load() {
            setLoading(true);
            const { AuthService } = await import('@/services/auth-service');
            const profile = await AuthService.getCurrentProfile();

            if (unwrappedParams.id === 'new') {
                if (profile && profile.role !== 'SUPER_ADMIN') {
                    alert("Yeni mekan ekleme yetkiniz yok.");
                    router.push('/admin');
                    return;
                }

                const newVenueTemplate: Partial<Venue> = {
                    name: 'Yeni Mekan',
                    slug: 'yeni-mekan',
                    description: '',
                    products: [],
                    categories: [],
                    allergens: [],
                    supportedLanguages: ['tr', 'en'],
                    defaultLanguage: 'tr',
                    theme: {
                        primary: '#000000',
                        secondary: '#ffffff',
                        background: '#ffffff',
                        foreground: '#000000',
                        headerColor: '#ffffff',
                        labelColor: '#000000',
                        cardStyle: 'modern'
                    }
                };

                setVenueData(newVenueTemplate as Venue);
                setProducts([]);
                setCategories([]);

                // Load global allergens
                try {
                    const globalAllergens = await AllergenService.getAllergens();
                    setAllergens(globalAllergens);
                } catch (e) {
                    console.log("Alerjenler yüklenemedi", e);
                }

                setLoading(false);
                return;
            }

            if (profile && profile.role !== 'SUPER_ADMIN') {
                if (!profile.venue_ids || !profile.venue_ids.includes(unwrappedParams.id)) {
                    alert("Bu mekana erişim yetkiniz yok.");
                    router.push('/admin');
                    return;
                }
            }

            const data = await VenueService.getVenueById(unwrappedParams.id);
            if (data) {
                setVenueData(data);
                setProducts(data.products || []);
                setCategories(data.categories || []);
                // Load global allergens
                const globalAllergens = await AllergenService.getAllergens();
                setAllergens(globalAllergens);
            }
            setLoading(false);
        }
        load();
    }, [unwrappedParams.id, router]);

    // --- Handlers ---

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleVenueChange = (field: keyof Venue, value: any) => {
        if (!venueData) return;

        // Update local state
        if (field === 'theme') {
            setVenueData({ ...venueData, theme: { ...venueData.theme, ...value } });
        } else {
            setVenueData({ ...venueData, [field]: value });
        }
        setVenueSettingsChanged(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleProductChange = (productId: string, field: keyof Product, value: any) => {
        setProducts(prev => prev.map(p => {
            if (p.id === productId) {
                return { ...p, [field]: value };
            }
            return p;
        }));
        setUnsavedChanges(prev => new Set(prev).add(productId));

        // If editing in modal, keep modal data in sync
        if (editingProduct && editingProduct.id === productId) {
            setEditingProduct(prev => prev ? ({ ...prev, [field]: value }) : null);
        }
    };

    const handleDeleteVenue = async () => {
        if (!venueData || !window.confirm(`"${venueData.name}" adlı mekanı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
            return;
        }

        try {
            setSaving(true);
            await VenueService.deleteVenue(venueData.id!);
            router.push('/admin');
        } catch (e) {
            console.error("Mekan silinirken hata:", e);
            alert("Mekan silinirken bir hata oluştu.");
            setSaving(false);
        }
    };

    const handleSaveAll = async () => {
        if (!venueSettingsChanged && unsavedChanges.size === 0 && unsavedCategoryChanges.size === 0) {
            alert("Kaydedilecek yeni bir değişiklik yok.");
            return;
        }

        // Helper to calc diff
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const calculateVenueDiff = (oldV: any, newV: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const changes: any = {};
            if (oldV.name !== newV.name) changes.name = { from: oldV.name, to: newV.name };
            if (oldV.theme !== newV.theme) changes.theme = { from: oldV.theme, to: newV.theme };
            if (oldV.defaultLanguage !== newV.defaultLanguage) changes.language = { from: oldV.defaultLanguage, to: newV.defaultLanguage };
            return Object.keys(changes).length > 0 ? changes : null;
        };

        setSaving(true);
        try {
            // 1. Save Venue Settings
            if (unwrappedParams.id === 'new' && venueData) {
                const newSlug = venueData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
                const createdInfo = await VenueService.createVenue({
                    name: venueData.name,
                    slug: newSlug,
                    description: venueData.description || "Yeni Mekan",
                    theme: venueData.theme,
                    coverImage: venueData.coverImage,
                    logo: venueData.logo,
                    supportedLanguages: venueData.supportedLanguages,
                    defaultLanguage: venueData.defaultLanguage,
                    timezone: venueData.timezone,
                    popup_settings: venueData.popup_settings
                });

                if (createdInfo && createdInfo.id) {
                    alert("Yeni mekan başarıyla oluşturuldu! Ara yüz yenileniyor...");
                    router.push(`/admin/venues/${createdInfo.id}`);
                    return; // Stop here, reload page with new ID to continue editing categories/products safely
                } else {
                    throw new Error("Mekan oluşturulamadı.");
                }
            } else if (venueSettingsChanged && venueData) {
                // Fetch current venue state for diff
                try {
                    const originalVenue = await VenueService.getVenueById(venueData.id);
                    if (originalVenue) {
                        const diff = calculateVenueDiff(originalVenue, venueData);
                        if (diff) {
                            if (diff) {
                                // Log Removed
                            }
                        }
                    }
                } catch (e) { console.error("Validation log failed", e); }

                await VenueService.updateVenue(venueData.id, {
                    name: venueData.name,
                    description: venueData.description,
                    theme: venueData.theme,
                    coverImage: venueData.coverImage,
                    logo: venueData.logo,
                    supportedLanguages: venueData.supportedLanguages,
                    defaultLanguage: venueData.defaultLanguage,
                    timezone: venueData.timezone,
                    popup_settings: venueData.popup_settings
                });
                setVenueSettingsChanged(false);
            }

            // 2. Save Modified Products
            if (unsavedChanges.size > 0) {
                const promises = Array.from(unsavedChanges).map(async (prodId) => {
                    const product = products.find(p => p.id === prodId);
                    if (product) {
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const updatePayload: any = {
                                name: product.name,
                                price: product.price,
                                description: product.description,
                                categoryId: product.categoryId,
                                isAvailable: product.isAvailable,
                                isChefRecommendation: product.isChefRecommendation,
                                allergens: product.allergens,
                                image: product.image,
                                discount_type: product.discount_type,
                                discount_amount: product.discount_amount,
                                startTime: product.startTime,
                                endTime: product.endTime,
                                translations: product.translations,
                                labels: product.labels
                            };

                            // Update DB
                            await ProductService.updateProduct(prodId, updatePayload);

                        } catch (err) {
                            console.error("Product update failed for", prodId, err);
                        }
                    }
                });
                await Promise.all(promises);
                setUnsavedChanges(new Set());
            }

            // 3. Save Modified Categories
            if (unsavedCategoryChanges.size > 0) {
                const catPromises = Array.from(unsavedCategoryChanges).map(async (catId) => {
                    const cat = categories.find(c => c.id === catId);
                    if (cat) {
                        try {
                            await CategoryService.updateCategory(catId, {
                                isAvailable: cat.isAvailable,
                                startTime: cat.startTime,
                                endTime: cat.endTime,
                                name: cat.name,
                                translations: cat.translations,
                                parentId: cat.parentId
                            });
                        } catch (err) {
                            console.error("Category update failed for", catId, err);
                        }
                    }
                });
                await Promise.all(catPromises);
                setUnsavedCategoryChanges(new Set());
            }

            alert("Tüm değişiklikler başarıyla kaydedildi!");

        } catch (error) {
            console.error("Save failed:", error);
            alert("Kaydederken bir hata oluştu.");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateProduct = async () => {
        if (!venueData) return;

        // Just confirm, don't ask for name
        const confirm = window.confirm("Yeni bir taslak ürün oluşturulsun mu?");
        if (!confirm) return;

        const newProduct = {
            name: "Yeni Ürün",
            description: "Ürün açıklaması buraya...",
            price: 150,
            isAvailable: true,
            venueId: venueData.id,
            categoryId: categories[0]?.id,
            image: ""
        };

        try {
            const created = await ProductService.createProduct(newProduct);
            if (created) {
                setProducts(prev => [...prev, created]);
            }
        } catch (err) {
            console.error(err);
            alert("Ürün oluşturulamadı.");
        }
    };

    // Category Management
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [categoryModalTab, setCategoryModalTab] = useState<'general' | 'translations'>('general');

    const handleCreateCategory = () => {
        if (!venueData) return;
        setEditingCategory({ id: 'new', name: '', translations: {}, parentId: null } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        setCategoryModalTab('general');
        setIsCategoryModalOpen(true);
    };

    const handleEditCategory = (cat: Category) => {
        setEditingCategory({ ...cat, translations: cat.translations || {} });
        setCategoryModalTab('general');
        setIsCategoryModalOpen(true);
    };

    const handleSaveCategory = async () => {
        if (!editingCategory) return;
        try {
            if (editingCategory.id === 'new') {
                const created = await CategoryService.createCategory({
                    venueId: venueData!.id,
                    name: editingCategory.name,
                    translations: editingCategory.translations,
                    image: editingCategory.image,
                    coverImage: editingCategory.coverImage,
                    parentId: editingCategory.parentId
                });
                if (created) {
                    setCategories(prev => [...prev, created as import('@/data/db').Category]);
                }
            } else {
                // Update
                const catId = editingCategory.id || '';

                await CategoryService.updateCategory(catId, {
                    name: editingCategory.name,
                    translations: editingCategory.translations,
                    image: editingCategory.image,
                    coverImage: editingCategory.coverImage,
                    parentId: editingCategory.parentId,
                    startTime: editingCategory.startTime,
                    endTime: editingCategory.endTime
                });

                // Update local state
                setCategories(prev => prev.map(c => c.id === editingCategory.id ? (editingCategory as Category) : c));
            }
            setIsCategoryModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("Kategori kaydedilirken hata oluştu.");
        }
    };

    const handleDeleteCategory = async (catId: string) => {
        const hasProducts = products.some(p => p.categoryId === catId);
        if (hasProducts) {
            alert("Bu kategoriye ait ürünler var. Lütfen önce ürünleri silin veya taşıyın.");
            return;
        }

        if (!window.confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;

        try {
            await CategoryService.deleteCategory(catId);
            setCategories(prev => prev.filter(c => c.id !== catId));
        } catch (e) {
            console.error(e);
            alert("Kategori silinirken hata oluştu.");
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCategoryChange = (catId: string, field: keyof Category, value: any) => {
        // Optimistic UI update only. Will be saved on "Kaydet" click.
        setCategories(prev => prev.map(c =>
            c.id === catId ? { ...c, [field]: value } : c
        ));
        setUnsavedCategoryChanges(prev => new Set(prev).add(catId));
    };

    const handleMoveCategory = async (catId: string, direction: 'up' | 'down') => {
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;

        // Find siblings
        const siblings = categories.filter(c => (c.parentId || null) === (cat.parentId || null));
        const currentIndex = siblings.findIndex(c => c.id === catId);

        let targetSibling = null;
        if (direction === 'up' && currentIndex > 0) {
            targetSibling = siblings[currentIndex - 1];
        } else if (direction === 'down' && currentIndex < siblings.length - 1) {
            targetSibling = siblings[currentIndex + 1];
        }

        if (!targetSibling) return;

        const mainIndexA = categories.findIndex(c => c.id === cat.id);
        const mainIndexB = categories.findIndex(c => c.id === targetSibling.id);

        const newCats = [...categories];
        newCats[mainIndexA] = targetSibling;
        newCats[mainIndexB] = cat;

        setCategories(newCats);
        try {
            await CategoryService.updateCategoryOrder(newCats.map(c => c.id));
        } catch (e) {
            console.error(e);
            alert("Kategori sıralaması güncellenemedi.");
        }
    };

    const handleDeleteProduct = async (prodId: string) => {
        if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
        try {
            await ProductService.deleteProduct(prodId);
            setProducts(prev => prev.filter(p => p.id !== prodId));
            setUnsavedChanges(prev => {
                const next = new Set(prev);
                next.delete(prodId);
                return next;
            });
        } catch (e) {
            console.error(e);
            alert("Ürün silinemedi.");
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleImportProducts = async (importedData: any[]) => {
        if (!venueData) return;
        setLoading(true);
        try {
            // Find or create categories first
            const catMap = new Map<string, string>(); // Name -> ID
            categories.forEach(c => catMap.set(c.name.toLowerCase(), c.id));

            for (const item of importedData) {
                const catName = (item.categoryName || "Genel").toLowerCase();
                let categoryId = catMap.get(catName);
                if (!categoryId) {
                    // Create new category if not exists
                    const newCat = await CategoryService.createCategory({ venueId: venueData!.id, name: item.categoryName || "Genel" });
                    if (newCat && newCat.id) {
                        categoryId = newCat.id;
                        catMap.set(catName, newCat.id);
                        // Update local state immediately so next items find it
                        setCategories(prev => [...prev, newCat as import('@/data/db').Category]);
                    }
                }

                if (!categoryId) continue; // Should not happen

                // Check if it is UPDATE (has ID) or CREATE
                if (item.id) {
                    await ProductService.updateProduct(item.id, {
                        name: item.name,
                        description: item.description,
                        price: item.price,
                        categoryId: categoryId, // Allow category change
                        image: item.image,
                        isAvailable: item.isAvailable,
                        isChefRecommendation: item.isChefRecommendation,
                        allergens: item.allergens,
                        discount_type: item.discount_type,
                        discount_amount: item.discount_amount,
                        startTime: item.startTime,
                        endTime: item.endTime
                    });
                } else {
                    await ProductService.createProduct({
                        venueId: venueData.id,
                        categoryId: categoryId,
                        name: item.name,
                        description: item.description,
                        price: item.price,
                        image: item.image,
                        isAvailable: item.isAvailable,
                        isChefRecommendation: item.isChefRecommendation,
                        allergens: item.allergens,
                        discount_type: item.discount_type,
                        discount_amount: item.discount_amount,
                        startTime: item.startTime,
                        endTime: item.endTime
                    });
                }
            }

            // Refresh Products
            const updatedVenue = await VenueService.getVenueById(venueData.id);
            if (updatedVenue) {
                setProducts(updatedVenue.products);
            }
            alert("İçe aktırma/güncelleme tamamlandı.");

        } catch (err) {
            console.error(err);
            alert("İçe aktırma sırasında bir hata oluştu: " + err);
        } finally {
            setLoading(false);
        }
    };

    const handleExportProducts = async () => {
        // Dynamic import to avoid large bundle size on initial load if not needed
        const XLSX = await import("xlsx");

        const exportData = products.map(p => {
            const catName = categories.find(c => c.id === p.categoryId)?.name || "Genel";
            return {
                "ID": p.id, // Export ID for update capability
                "Ürün Adı": p.name,
                "Ürün Adı (EN)": p.translations?.en?.name || "",
                "Açıklama": p.description,
                "Açıklama (EN)": p.translations?.en?.description || "",
                "Fiyat": p.price,
                "Kategori": catName,
                "Kategori (EN)": categories.find(c => c.id === p.categoryId)?.translations?.en?.name || "",
                "Alerjenler": p.allergens ? p.allergens.join(", ") : "",
                "Şef": p.isChefRecommendation ? "Evet" : "Hayır",
                "İndirim Tipi": p.discount_type || "",
                "İndirim Değeri": p.discount_amount || "",
                "Başlama Saati": p.startTime || "",
                "Bitiş Saati": p.endTime || "",
                "Durum": p.isAvailable ? "Aktif" : "Pasif",
                "Görsel Dosya Adı": p.image ? p.image : "" // Export current URL as filename reference
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        // Hide ID column for cleaner look (optional, but better to keep visible for power users)
        // ws['!cols'] = [{hidden: true}, ...];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Menü");
        XLSX.writeFile(wb, `${venueData?.name || "menu"}_export.xlsx`);
    };

    const openAllergenModal = (product: Product) => {
        setEditingProduct(product);
        setIsAllergenModalOpen(true);
    };


    if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-900">Yükleniyor...</div>;
    if (!venueData) return <div className="min-h-screen flex items-center justify-center text-zinc-900">Mekan bulunamadı.</div>;

    return (
        <div className="space-y-6 pb-20 text-zinc-900">

            {/* Sticky Top Bar for Saving */}
            <div className={cn(
                "sticky top-0 z-30 bg-white/80 backdrop-blur-md border border-zinc-200 p-4 rounded-xl shadow-sm flex items-center justify-between transition-all",
                (unsavedChanges.size > 0 || venueSettingsChanged) ? "border-amber-200 bg-amber-50/90" : ""
            )}>
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" /> Geri</Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900">{venueData.name}</h1>
                        <div className="text-xs text-zinc-500">
                            {(unsavedChanges.size > 0 || venueSettingsChanged)
                                ? <span className="text-amber-600 font-semibold">● Kaydedilmemiş değişiklikler var</span>
                                : "Tüm değişiklikler güncel"}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Link href={`/${venueData.slug}`} target="_blank">
                        <Button variant="outline">Önizle</Button>
                    </Link>
                    <Button
                        onClick={handleSaveAll}
                        className={cn(
                            "min-w-[140px]",
                            (unsavedChanges.size > 0 || venueSettingsChanged) ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
                        )}
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Kaydet
                    </Button>
                </div>
            </div>


            {/* Tabs */}
            <div className="border-b border-zinc-200">
                <div className="flex gap-6">
                    <button onClick={() => setActiveTab('products')} className={cn("pb-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'products' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-700")}>
                        Ürün Listesi
                    </button>
                    <button onClick={() => setActiveTab('categories')} className={cn("pb-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'categories' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-700")}>
                        Kategoriler
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={cn("pb-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'settings' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-700")}>
                        Mekan Ayarları
                    </button>
                    <button onClick={() => setActiveTab('allergens')} className={cn("pb-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'allergens' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-700")}>
                        Alerjenler
                    </button>
                    <button onClick={() => setActiveTab('campaigns')} className={cn("pb-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'campaigns' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-700")}>
                        Kampanyalar
                    </button>
                </div>
            </div>

            {/* Content Area */}

            {/* 1. PRODUCTS TAB */}
            {activeTab === 'products' && (
                <div className="space-y-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-zinc-900">Ürünler <span className="text-zinc-500 text-sm ml-2 font-normal">({filteredProducts.length} Tüm Ürünler)</span></h2>
                            <div className="flex gap-2">
                                <ProductImporter
                                    onImport={handleImportProducts}
                                    onExport={handleExportProducts}
                                    existingCategories={categories}
                                />
                                <Button onClick={handleCreateProduct}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Yeni Ürün
                                </Button>
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl flex flex-wrap gap-4 items-end shadow-sm">
                            <div className="flex-1 min-w-[200px] space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-500">Ürün Ara</label>
                                <div className="relative">
                                    <Input
                                        placeholder="Ürün veya kategori ara..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 bg-white"
                                    />
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                </div>
                            </div>
                            <div className="w-56 space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-500">Kategori</label>
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="w-full h-10 px-3 rounded-md border border-input bg-white text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                >
                                    <option value="">Tümü</option>
                                    {treeSortedCategories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {getCategoryBreadcrumb(cat.id, categories)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-36 space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-500">Durum</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="w-full h-10 px-3 rounded-md border border-input bg-white text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                >
                                    <option value="all">Tümü</option>
                                    <option value="active">Aktif</option>
                                    <option value="inactive">Gizli</option>
                                </select>
                            </div>
                            <div className="flex gap-4 items-center h-10">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <Switch checked={filterChef} onCheckedChange={setFilterChef} />
                                    <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors flex items-center gap-1"><Star className="w-4 h-4 text-amber-500" /> Şef</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <Switch checked={filterDiscount} onCheckedChange={setFilterDiscount} />
                                    <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">İndirimli</span>
                                </label>
                            </div>
                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-10 text-red-500 hover:text-red-600 hover:bg-red-50">
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Temizle
                                </Button>
                            )}
                        </div>
                    </div>



                    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 border-b border-zinc-200">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-zinc-500 w-16">Görsel</th>
                                    <th className="px-6 py-3 font-medium text-zinc-500">Ürün Adı & Açıklama</th>
                                    <th className="px-6 py-3 font-medium text-zinc-500">Kategori</th>
                                    <th className="px-6 py-3 font-medium text-zinc-500">Fiyat</th>
                                    <th className="px-6 py-3 font-medium text-zinc-500 text-center">Şefin Tavsiyesi</th>
                                    <th className="px-6 py-3 font-medium text-zinc-500 text-center">Durum</th>
                                    <th className="px-6 py-3 font-medium text-zinc-500 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                                {paginatedProducts.map((product) => (
                                    <tr key={product.id} className={cn("transition-colors group", unsavedChanges.has(product.id) ? "bg-amber-50/40" : "hover:bg-zinc-50/50")}>

                                        {/* Image */}
                                        <td className="px-6 py-4">
                                            <AdminProductImage
                                                product={product}
                                                defaultImage={venueData?.theme?.defaultProductImage}
                                                onClick={() => openAllergenModal(product)}
                                            />
                                        </td>

                                        {/* Name & Description */}
                                        <td className="px-6 py-4 font-medium text-zinc-900">
                                            <input
                                                className="bg-transparent focus:bg-white border border-transparent focus:border-primary/20 rounded px-1 py-0.5 outline-none w-full text-zinc-900 font-semibold"
                                                value={product.name}
                                                onChange={(e) => handleProductChange(product.id, 'name', e.target.value)}
                                            />
                                            <div className="text-zinc-400 text-xs mt-1 flex items-center gap-1 cursor-pointer hover:text-primary" onClick={() => openAllergenModal(product)}>
                                                <span className="truncate max-w-[200px]">{product.description || "Açıklama ekle..."}</span>
                                                <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                            </div>
                                            {/* Badges preview */}
                                            {product.allergens && product.allergens.length > 0 && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    {Array.from(new Set(product.allergens)).map(a => (
                                                        <span key={a} className="text-[9px] px-1 bg-zinc-100 text-zinc-500 border border-zinc-200 rounded">{a}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>

                                        {/* Category */}
                                        <td className="px-6 py-4 text-zinc-600">
                                            <select
                                                className="bg-transparent outline-none cursor-pointer hover:text-zinc-900 p-1 rounded hover:bg-zinc-100"
                                                value={product.categoryId}
                                                onChange={(e) => handleProductChange(product.id, 'categoryId', e.target.value)}
                                            >
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* Price */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                <input
                                                    className="bg-transparent focus:bg-white border border-transparent focus:border-primary/20 rounded px-1 py-0.5 outline-none w-20 text-right font-mono text-zinc-900"
                                                    type="number"
                                                    value={product.price}
                                                    onChange={(e) => handleProductChange(product.id, 'price', parseFloat(e.target.value))}
                                                />
                                                <span className="text-zinc-500">₺</span>
                                            </div>
                                        </td>

                                        {/* Chef Rec */}
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleProductChange(product.id, 'isChefRecommendation', !product.isChefRecommendation)}
                                                className={cn("p-1 rounded-full transition-colors", product.isChefRecommendation ? "text-amber-400 bg-amber-50" : "text-zinc-300 hover:text-zinc-400")}
                                            >
                                                <Star className={cn("h-5 w-5", product.isChefRecommendation && "fill-current")} />
                                            </button>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Switch
                                                    checked={product.isAvailable}
                                                    onCheckedChange={(val) => handleProductChange(product.id, 'isAvailable', val)}
                                                />
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteProduct(product.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredProducts.length === 0 && (
                            <div className="py-12 text-center text-zinc-500 flex flex-col items-center">
                                <SearchIcon className="w-12 h-12 text-zinc-300 mb-4" />
                                <p className="text-lg font-medium text-zinc-900">Ürün bulunamadı</p>
                                <p className="text-sm mt-1 mb-4">Arama kriterlerinize uyan ürün bulunmuyor.</p>
                                {hasActiveFilters && (
                                    <Button variant="outline" onClick={resetFilters}>Filtreleri Temizle</Button>
                                )}
                            </div>
                        )}

                        {filteredProducts.length > 0 && (
                            <div className="bg-zinc-50 border-t border-zinc-200 px-6 py-4 flex items-center justify-between">
                                <div className="text-sm text-zinc-500">
                                    Toplam <span className="font-medium text-zinc-900">{filteredProducts.length}</span> üründen <span className="font-medium text-zinc-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</span> arası gösteriliyor
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline" size="sm"
                                        onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
                                    </Button>

                                    <div className="flex items-center gap-1 mx-2">
                                        {Array.from({ length: totalPages }).map((_, i) => {
                                            const p = i + 1;
                                            if (totalPages > 7) {
                                                if (p !== 1 && p !== totalPages && Math.abs(currentPage - p) > 1) {
                                                    if (p === 2 || p === totalPages - 1) return <span key={p} className="text-zinc-400 px-1">...</span>;
                                                    return null;
                                                }
                                            }
                                            return (
                                                <button
                                                    key={p}
                                                    onClick={() => { setCurrentPage(p); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                                                    className={cn("w-8 h-8 rounded text-sm font-medium transition-colors", currentPage === p ? "bg-primary text-primary-foreground" : "hover:bg-zinc-200 text-zinc-600")}
                                                >
                                                    {p}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <Button
                                        variant="outline" size="sm"
                                        onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                                        disabled={currentPage === totalPages}
                                    >
                                        Sonraki <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'categories' && (
                <div className="flex flex-col gap-3">
                    {treeSortedCategories.map((cat, index) => {
                        const depth = getCategoryDepth(cat.id, categories);
                        // find subcategory product counts recursively
                        const getCatAndSubcatsProductsCount = (catId: string): number => {
                            const directProducts = products.filter(p => p.categoryId === catId).length;
                            const subcats = categories.filter(c => c.parentId === catId);
                            let subcatProds = 0;
                            subcats.forEach(sc => subcatProds += getCatAndSubcatsProductsCount(sc.id));
                            return directProducts + subcatProds;
                        };
                        const totalProds = getCatAndSubcatsProductsCount(cat.id);
                        const directProds = products.filter(p => p.categoryId === cat.id);

                        const siblings = categories.filter(c => (c.parentId || null) === (cat.parentId || null));
                        const siblingIndex = siblings.findIndex(c => c.id === cat.id);
                        const isFirstSibling = siblingIndex === 0;
                        const isLastSibling = siblingIndex === siblings.length - 1;

                        return (
                            <Card
                                key={cat.id}
                                className={cn(
                                    "group hover:border-primary/50 transition-colors bg-white relative",
                                    depth > 0 ? "border-l-[3px] border-l-primary/40 rounded-l-sm" : ""
                                )}
                                style={{ marginLeft: `${depth * 2}rem` }}
                            >
                                <div className="flex items-center p-4">
                                    {/* Sorting Arrows */}
                                    <div className="flex flex-col gap-1 mr-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-900"
                                            onClick={(e) => { e.stopPropagation(); handleMoveCategory(cat.id, 'up'); }}
                                            disabled={isFirstSibling}
                                        >
                                            <ArrowUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-900"
                                            onClick={(e) => { e.stopPropagation(); handleMoveCategory(cat.id, 'down'); }}
                                            disabled={isLastSibling}
                                        >
                                            <ArrowDown className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Content Clickable Area */}
                                    <div
                                        className="flex-1 flex items-center gap-4 cursor-pointer"
                                        onClick={() => handleEditCategory(cat)}
                                    >
                                        <div className="h-16 w-16 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-300 shrink-0 overflow-hidden border border-zinc-100 relative shadow-sm">
                                            {cat.image ? (
                                                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <LucideImage className="h-6 w-6 opacity-50" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <div className="flex items-center gap-2">
                                                <div className="font-bold text-lg text-zinc-900 truncate">{cat.name}</div>
                                                {cat.parentId && (
                                                    <span className="text-[10px] font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full border border-zinc-200">
                                                        Alt Kategori
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-zinc-500 mt-1 flex items-center gap-3">
                                                <span>{totalProds} Ürün {depth === 0 && categories.filter(c => c.parentId === cat.id).length > 0 ? `(${categories.filter(c => c.parentId === cat.id).length} Alt Kategori)` : ''}</span>
                                                {(cat.startTime || cat.endTime) && (
                                                    <span className="font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                        ⏱ {cat.startTime?.substring(0, 5) || '00:00'} - {cat.endTime?.substring(0, 5) || '23:59'}
                                                    </span>
                                                )}
                                            </div>
                                            {directProds.length > 0 && (
                                                <div className="text-[11px] text-zinc-400 mt-1.5 truncate max-w-xl" title={directProds.map(p => p.name).join(', ')}>
                                                    İçerik: {directProds.map(p => p.name).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Controls - Fixed Layout */}
                                    <div className="flex items-center gap-6 pl-4 border-l border-zinc-100 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-xs font-medium w-10 text-right transiiton-colors", cat.isAvailable !== false ? 'text-primary' : 'text-zinc-400')}>
                                                {cat.isAvailable !== false ? 'Aktif' : 'Gizli'}
                                            </span>
                                            <Switch
                                                checked={cat.isAvailable !== false}
                                                onCheckedChange={(val) => {
                                                    handleCategoryChange(cat.id, 'isAvailable', val);
                                                }}
                                            />
                                        </div>
                                        <div className="flex gap-1.5">
                                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditCategory(cat)}>
                                                <Edit2 className="h-4 w-4 text-zinc-500" />
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => handleDeleteCategory(cat.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                    <button
                        onClick={handleCreateCategory}
                        className="h-full min-h-[80px] border-2 border-dashed border-zinc-200 rounded-xl flex items-center justify-center gap-2 text-zinc-500 hover:border-primary hover:text-primary transition-colors bg-zinc-50/50"
                    >
                        <Plus className="h-5 w-5" />
                        Yeni Kategori
                    </button>
                </div>
            )}

            {/* 3. SETTINGS TAB */}
            {activeTab === 'settings' && venueData && (
                <div className="max-w-2xl">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mekan Ayarları</CardTitle>
                            <CardDescription>Genel görünüm ve marka ayarları.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Kapak Görseli</label>
                                    <ImageUpload
                                        value={venueData.coverImage || ""}
                                        onChange={(url) => handleVenueChange('coverImage', url)}
                                        onRemove={() => handleVenueChange('coverImage', "")}
                                        folder="qr-menu/venues"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Mekan Logosu</label>
                                    <ImageUpload
                                        value={(venueData as any).logo || ""}
                                        onChange={(url) => handleVenueChange('logo', url)}
                                        onRemove={() => handleVenueChange('logo', "")}
                                        folder="qr-menu/venues/logos"
                                    />
                                    <div className="flex flex-col gap-3 mt-4">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={venueData.theme?.showLogoInMenu === true}
                                                onCheckedChange={(c) => handleVenueChange('theme', { showLogoInMenu: c })}
                                            />
                                            <span className="text-sm font-medium text-zinc-700">Logoyu menü içerisinde göster</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={venueData.theme?.showDescriptionInMenu !== false}
                                                onCheckedChange={(c) => handleVenueChange('theme', { showDescriptionInMenu: c })}
                                            />
                                            <span className="text-sm font-medium text-zinc-700">Açıklamayı menü içerisinde göster</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-500 max-w-[200px] mt-2">Menü karşılama ekranında görünecek ekstra alanları yönetin.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Mekan Adı</label>
                                    <Input value={venueData.name} onChange={(e) => handleVenueChange('name', e.target.value)} className="bg-white text-zinc-900" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Açıklama</label>
                                    <Input value={venueData.description || ""} onChange={(e) => handleVenueChange('description', e.target.value)} placeholder="Örn: Taze kahve ve günlük tatlılar..." className="bg-white text-zinc-900" />
                                </div>
                                <div className="space-y-4 col-span-2">
                                    <div className="flex items-center justify-between border-b pb-2 mb-2 mt-2">
                                        <h4 className="font-medium text-sm text-zinc-700">Renk Ayarları</h4>
                                        <span className="text-xs text-zinc-400">Temanızın renk paletini özelleştirin</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Tema Rengi (Vurgu)</label>
                                            <div className="flex gap-2">
                                                <div className="h-10 w-10 rounded-lg border shadow-sm shrink-0 transition-colors" style={{ backgroundColor: venueData.theme?.primary }} />
                                                <Input value={venueData.theme?.primary} onChange={(e) => handleVenueChange('theme', { primary: e.target.value })} className="bg-white text-zinc-900 font-mono" />
                                            </div>
                                            <p className="text-[10px] text-zinc-500">Butonlar ve aktif öğeler.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">İkincil Renk</label>
                                            <div className="flex gap-2">
                                                <div className="h-10 w-10 rounded-lg border shadow-sm shrink-0 transition-colors" style={{ backgroundColor: venueData.theme?.secondary || '#ffffff' }} />
                                                <Input value={venueData.theme?.secondary} onChange={(e) => handleVenueChange('theme', { secondary: e.target.value })} className="bg-white text-zinc-900 font-mono" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Arka Plan Rengi</label>
                                            <div className="flex gap-2">
                                                <div className="h-10 w-10 rounded-lg border shadow-sm shrink-0 transition-colors" style={{ backgroundColor: venueData.theme?.background }} />
                                                <Input value={venueData.theme?.background} onChange={(e) => handleVenueChange('theme', { background: e.target.value })} className="bg-white text-zinc-900 font-mono" />
                                            </div>
                                            <p className="text-[10px] text-zinc-500">Sayfanın genel zemin rengi.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Yazı Rengi</label>
                                            <div className="flex gap-2">
                                                <div className="h-10 w-10 rounded-lg border shadow-sm shrink-0 transition-colors" style={{ backgroundColor: venueData.theme?.foreground }} />
                                                <Input value={venueData.theme?.foreground} onChange={(e) => handleVenueChange('theme', { foreground: e.target.value })} className="bg-white text-zinc-900 font-mono" />
                                            </div>
                                            <p className="text-[10px] text-zinc-500">Başlık ve metin renkleri.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Etiket Rengi</label>
                                            <div className="flex gap-2">
                                                <div className="h-10 w-10 rounded-lg border shadow-sm shrink-0 transition-colors" style={{ backgroundColor: venueData.theme?.labelColor || '#F59E0B' }} />
                                                <Input value={venueData.theme?.labelColor || '#F59E0B'} onChange={(e) => handleVenueChange('theme', { labelColor: e.target.value })} className="bg-white text-zinc-900 font-mono" />
                                            </div>
                                            <p className="text-[10px] text-zinc-500">İndirim, şefin tavsiyesi vb.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Header Rengi</label>
                                            <div className="flex gap-2">
                                                <div className="h-10 w-10 rounded-lg border shadow-sm shrink-0 transition-colors" style={{ backgroundColor: venueData.theme?.headerColor || '#ffffff' }} />
                                                <Input value={venueData.theme?.headerColor || '#ffffff'} onChange={(e) => handleVenueChange('theme', { headerColor: e.target.value })} className="bg-white text-zinc-900 font-mono" />
                                            </div>
                                            <p className="text-[10px] text-zinc-500">Üst menü çubuğu arkaplanı.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Kart Rengi</label>
                                            <div className="flex gap-2">
                                                <div className="h-10 w-10 rounded-lg border shadow-sm shrink-0 transition-colors" style={{ backgroundColor: venueData.theme?.cardColor || 'transparent' }} />
                                                <Input value={venueData.theme?.cardColor || ''} onChange={(e) => handleVenueChange('theme', { cardColor: e.target.value })} placeholder="Otomatik" className="bg-white text-zinc-900 font-mono" />
                                            </div>
                                            <p className="text-[10px] text-zinc-500">Ürün kutusu arkaplanı.</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-dashed border-zinc-200">
                                        <label className="text-sm font-medium block mb-2">Ürün Kart Tasarımı</label>
                                        <div className="flex gap-2">
                                            {['modern', 'minimal', 'bordered', 'glass'].map((style) => (
                                                <button
                                                    key={style}
                                                    onClick={() => handleVenueChange('theme', { cardStyle: style })}
                                                    className={cn(
                                                        "px-3 py-1.5 text-xs border rounded-lg transition-all capitalize",
                                                        (venueData.theme?.cardStyle || 'modern') === style ? "bg-primary text-white border-primary" : "bg-white text-zinc-700 hover:bg-zinc-50"
                                                    )}
                                                >
                                                    {style === 'glass' ? style + ' 💧' : style}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 mt-4 space-y-3 pt-4 border-t border-dashed border-zinc-200">
                                        <label className="text-sm font-medium block">Hızlı Tema Seçimi</label>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                            {THEME_PRESETS.map(preset => (
                                                <button
                                                    key={preset.name}
                                                    onClick={() => handleVenueChange('theme', preset.colors)}
                                                    className="flex flex-col gap-2 p-3 border border-zinc-200 rounded-xl hover:border-primary hover:bg-zinc-50 transition-all text-left bg-white shadow-sm group"
                                                >
                                                    <div className="flex gap-1 mb-1">
                                                        <div className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.colors.background }} title="Background" />
                                                        <div className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.colors.primary }} title="Primary" />
                                                        <div className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.colors.foreground }} title="Text" />
                                                        <div className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.colors.headerColor }} title="Header" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-zinc-700 group-hover:text-primary transition-colors">{preset.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 italic">
                                            * Tema seçtiğinizde renk ayarları otomatik güncellenir. Değişiklikleri uygulamak için yukarıdaki &quot;Kaydet&quot; butonunu kullanın.
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium">Varsayılan Ürün Görseli</label>
                                    <p className="text-xs text-zinc-500 mb-2">Ürün resmi olmayan kartlarda bu görsel gösterilir.</p>
                                    <ImageUpload
                                        value={venueData.theme?.defaultProductImage || ""}
                                        onChange={(url) => handleVenueChange('theme', { defaultProductImage: url })}
                                        onRemove={() => handleVenueChange('theme', { defaultProductImage: "" })}
                                        folder="qr-menu/venues"
                                    />
                                </div>
                                <div className="space-y-4 col-span-2">
                                    <label className="text-sm font-medium">Mekan Saat Dilimi (Timezone)</label>
                                    <p className="text-[10px] text-zinc-500 mb-1">Menülerdeki zaman kısıtlamaları (Örn: Kahvaltı 06:00-12:00) bu saat dilimine göre hesaplanır.</p>
                                    <select
                                        className="w-full h-10 rounded-md border border-zinc-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        value={venueData.timezone || 'Europe/Istanbul'}
                                        onChange={(e) => handleVenueChange('timezone', e.target.value)}
                                    >
                                        <option value="Europe/Istanbul">Türkiye Saati (Europe/Istanbul)</option>
                                        <option value="Europe/London">İngiltere Saati (Europe/London)</option>
                                        <option value="Europe/Berlin">Avrupa Saati (Europe/Berlin)</option>
                                        <option value="America/New_York">New York Saati (America/New_York)</option>
                                        <option value="Asia/Dubai">Dubai Saati (Asia/Dubai)</option>
                                        <option value="UTC">UTC (Eşgüdümlü Evrensel Zaman)</option>
                                    </select>
                                </div>
                            </div>


                            <div className="space-y-4 pt-4 border-t border-zinc-100">
                                <div>
                                    <h4 className="font-medium mb-2">Dil Ayarları</h4>
                                    <p className="text-sm text-zinc-500 mb-4">Müşterilerinizin menüyü görüntüleyebileceği dilleri seçin. En az bir varsayılan dil seçili kalmalıdır.</p>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {AVAILABLE_LANGUAGES.map(lang => (
                                            <div
                                                key={lang.code}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                    (venueData.supportedLanguages || ['tr']).includes(lang.code)
                                                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                        : "border-zinc-200 hover:border-zinc-300"
                                                )}
                                                onClick={() => {
                                                    const current = venueData.supportedLanguages || ['tr'];
                                                    if (current.includes(lang.code)) {
                                                        // Prevent removing if it's the only one or default
                                                        // For simplicity, prevent removing if length is 1
                                                        if (current.length > 1 && lang.code !== (venueData.defaultLanguage || 'tr')) {
                                                            handleVenueChange('supportedLanguages', current.filter(c => c !== lang.code));
                                                        } else if (current.length === 1) {
                                                            alert("En az bir dil seçili olmalıdır.");
                                                        }
                                                    } else {
                                                        handleVenueChange('supportedLanguages', [...current, lang.code]);
                                                    }
                                                }}
                                            >
                                                <span className="text-2xl drop-shadow-sm">{lang.flag}</span>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-zinc-900">{lang.name}</span>
                                                    <span className="text-xs text-zinc-400 uppercase font-mono">{lang.code}</span>
                                                </div>
                                                {(venueData.supportedLanguages || ['tr']).includes(lang.code) && (
                                                    <Check className="h-4 w-4 text-primary ml-auto" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Save button is now in sticky header, but we can keep one here too */}
                            {/* <Button onClick={handleSaveAll} disabled={saving} className="w-full">
                            {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Ayarları Kaydet
                        </Button> */}
                            <div className="text-sm text-zinc-500 italic mb-10">
                                Değişiklikleri kaydetmek için yukarıdaki &quot;Kaydet&quot; butonunu kullanın.
                            </div>

                            {/* Danger Zone */}
                            <div className="mt-12 pt-6 border-t border-red-200">
                                <h4 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Tehlikeli Bölge
                                </h4>
                                <p className="text-sm text-zinc-500 mb-4">Mekanı tamamen silerseniz, içerisindeki tüm kategoriler, ürünler ve görseller de silinecektir. Bu işlem geri alınamaz.</p>
                                <Button
                                    variant="danger"
                                    onClick={handleDeleteVenue}
                                    disabled={saving}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Mekanı Kalıcı Olarak Sil
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 4. ALLERGENS TAB */}
            {activeTab === 'allergens' && venueData && (
                <div className="space-y-4">
                    <div className="flex justify-end p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <Button
                            variant="danger"
                            size="sm"
                            className="text-xs"
                            onClick={async () => {
                                if (!confirm("DİKKAT! Tüm ürünlerin üzerindeki alerjen etiketleri temizlenecek. Bu işlem geri alınamaz. Emin misiniz?")) return;
                                try {
                                    setSaving(true);
                                    for (const p of products) {
                                        await ProductService.updateProduct(p.id, { allergens: [] });
                                        // Update local state
                                        setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, allergens: [] } : pr));
                                    }
                                    alert("Tüm ürünlerin alerjenleri temizlendi.");
                                } catch (e) {
                                    alert("Hata oluştu.");
                                    console.error(e);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Tüm Ürün Alerjenlerini Temizle (Reset)
                        </Button>
                    </div>
                    <AllergenManager
                        allergens={allergens}
                        products={products}
                        supportedLanguages={venueData.supportedLanguages || ['tr']}
                        defaultLanguage={venueData.defaultLanguage || 'tr'}
                        onUpdate={async () => {
                            const globalAllergens = await AllergenService.getAllergens();
                            setAllergens(globalAllergens);
                        }}
                    />
                </div>
            )}

            {/* 5. CAMPAIGNS TAB */}
            {activeTab === 'campaigns' && venueData && (
                <div className="space-y-6 max-w-3xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">Pop-up Yönetimi</h2>
                            <p className="text-sm text-zinc-500">Müşterileriniz menünüzü açtığında karşılarına çıkacak olan tanıtım veya kampanya pop-up&apos;larını buradan yönetebilirsiniz.</p>
                        </div>
                        <Button onClick={() => {
                            const currentPopups = Array.isArray(venueData.popup_settings) ? venueData.popup_settings : [];
                            handleVenueChange('popup_settings', [...currentPopups, {
                                id: Math.random().toString(36).substr(2, 9),
                                isActive: false,
                                title: '',
                                content: '',
                                image: ''
                            }]);
                        }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Yeni Pop-up
                        </Button>
                    </div>

                    {(Array.isArray(venueData.popup_settings) ? venueData.popup_settings : []).map((popup: any, index: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                        <Card key={popup.id || index}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-base font-bold">Pop-up #{index + 1}</CardTitle>
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => {
                                    const currentPopups = Array.isArray(venueData.popup_settings) ? venueData.popup_settings : [];
                                    handleVenueChange('popup_settings', currentPopups.filter((_, i) => i !== index));
                                }}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="flex items-center gap-2 mb-4 p-4 border border-zinc-200 rounded-lg bg-zinc-50 shadow-sm">
                                    <Switch
                                        checked={popup.isActive || false}
                                        onCheckedChange={(val) => {
                                            const currentPopups = Array.isArray(venueData.popup_settings) ? [...venueData.popup_settings] : [];
                                            currentPopups[index] = { ...currentPopups[index], isActive: val };
                                            handleVenueChange('popup_settings', currentPopups);
                                        }}
                                    />
                                    <div>
                                        <label className="text-sm font-bold text-zinc-900 cursor-pointer block">Pop-up Aktif</label>
                                        <span className="text-xs text-zinc-500">Müşteriler menüye ilk girdiklerinde bu pop-up&apos;ı görecekler.</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Başlık</label>
                                    <Input
                                        value={popup.title || ''}
                                        onChange={(e) => {
                                            const currentPopups = Array.isArray(venueData.popup_settings) ? [...venueData.popup_settings] : [];
                                            currentPopups[index] = { ...currentPopups[index], title: e.target.value };
                                            handleVenueChange('popup_settings', currentPopups);
                                        }}
                                        placeholder="Örn: Hafta Sonu Özel İndirimi!"
                                        className="bg-white text-zinc-900"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">İçerik Açıklaması</label>
                                    <textarea
                                        value={popup.content || ''}
                                        onChange={(e) => {
                                            const currentPopups = Array.isArray(venueData.popup_settings) ? [...venueData.popup_settings] : [];
                                            currentPopups[index] = { ...currentPopups[index], content: e.target.value };
                                            handleVenueChange('popup_settings', currentPopups);
                                        }}
                                        placeholder="Kampanya detaylarını buraya yazın..."
                                        className="w-full h-24 rounded-lg border border-zinc-200 p-3 text-sm focus:border-primary outline-none resize-none bg-white transition-colors text-zinc-900"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Pop-up Görseli</label>
                                    <ImageUpload
                                        value={popup.image || ''}
                                        onChange={(url) => {
                                            const currentPopups = Array.isArray(venueData.popup_settings) ? [...venueData.popup_settings] : [];
                                            currentPopups[index] = { ...currentPopups[index], image: url };
                                            handleVenueChange('popup_settings', currentPopups);
                                        }}
                                        onRemove={() => {
                                            const currentPopups = Array.isArray(venueData.popup_settings) ? [...venueData.popup_settings] : [];
                                            currentPopups[index] = { ...currentPopups[index], image: '' };
                                            handleVenueChange('popup_settings', currentPopups);
                                        }}
                                        folder="qr-menu/campaigns"
                                    />
                                </div>

                                <div className="space-y-2 pt-2 border-t border-zinc-100">
                                    <label className="text-sm font-medium">İncele Butonu Hedefi (Opsiyonel)</label>

                                    <select
                                        value={products.some(p => p.id === popup.link) ? popup.link : (popup.link?.startsWith('http') ? 'custom' : '')}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const currentPopups = Array.isArray(venueData.popup_settings) ? [...venueData.popup_settings] : [];
                                            if (val === 'custom') {
                                                currentPopups[index] = { ...currentPopups[index], link: 'https://' };
                                            } else {
                                                currentPopups[index] = { ...currentPopups[index], link: val };
                                            }
                                            handleVenueChange('popup_settings', currentPopups);
                                        }}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-white text-zinc-900 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">🔥 Kampanyalar Kategorisine Yönlendir</option>
                                        <optgroup label="İndirimli Ürünler (Kampanyalar)">
                                            {products.filter(p => p.discount_type && p.discount_amount).map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Standart Ürünler">
                                            {products.filter(p => !(p.discount_type && p.discount_amount)).map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </optgroup>
                                        <option value="custom">🌐 Farklı Bir Web Adresine Yönlendir (URL)</option>
                                    </select>

                                    {popup.link?.startsWith('http') && (
                                        <Input
                                            value={popup.link || ''}
                                            onChange={(e) => {
                                                const currentPopups = Array.isArray(venueData.popup_settings) ? [...venueData.popup_settings] : [];
                                                currentPopups[index] = { ...currentPopups[index], link: e.target.value };
                                                handleVenueChange('popup_settings', currentPopups);
                                            }}
                                            placeholder="https://..."
                                            className="bg-white text-zinc-900 mt-2"
                                        />
                                    )}
                                    <p className="text-xs text-zinc-500">Müşteri &quot;İncele&quot; butonuna bastığında otomatik olarak bu ürüne veya adrese gider.</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {(Array.isArray(venueData.popup_settings) ? venueData.popup_settings : []).length === 0 && (
                        <div className="text-center p-8 border-2 border-dashed border-zinc-200 rounded-xl">
                            <p className="text-zinc-500 mb-4">Henüz hiç pop-up oluşturmadınız.</p>
                            <Button variant="outline" onClick={() => {
                                handleVenueChange('popup_settings', [{
                                    id: Math.random().toString(36).substr(2, 9),
                                    isActive: true,
                                    title: '',
                                    content: '',
                                    image: ''
                                }]);
                            }}>
                                <Plus className="h-4 w-4 mr-2" />
                                İlk Pop-up&apos;ı Oluştur
                            </Button>
                        </div>
                    )}

                    <div className="text-sm text-zinc-500 italic mt-6">
                        Değişiklikleri kaydetmek için ekranın üst kısmındaki &quot;Kaydet&quot; butonunu kullanın.
                    </div>
                </div>
            )}

            {/* Product Detail / Edit / Create Modal */}
            {isAllergenModalOpen && editingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-4 pt-4 pb-0 sticky top-0 bg-white z-10">
                            <h3 className="font-bold text-lg text-zinc-900">
                                {editingProduct.id === 'new' ? 'Yeni Ürün Ekle' : 'Ürün Düzenle'}
                            </h3>
                            <button onClick={() => setIsAllergenModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b border-zinc-100 px-4 mt-2">
                            <button
                                onClick={() => setModalTab('general')}
                                className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", modalTab === 'general' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-700")}
                            >
                                Genel Bilgiler
                            </button>
                            <button
                                onClick={() => setModalTab('translations')}
                                className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", modalTab === 'translations' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-700")}
                            >
                                Çeviriler
                                <span className={cn("ml-2 text-[10px] px-1.5 py-0.5 rounded-full", venueData?.supportedLanguages?.length && venueData.supportedLanguages.length > 1 ? "bg-primary/10 text-primary" : "bg-zinc-100 text-zinc-400")}>
                                    {(venueData?.supportedLanguages?.length || 1) - 1}
                                </span>
                            </button>
                        </div>

                        <div className="p-6 space-y-6 min-h-[400px]">

                            {/* --- GENERAL TAB --- */}
                            {modalTab === 'general' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-200">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-sm font-medium">Ürün Adı</label>
                                            <Input
                                                value={editingProduct.name}
                                                onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                                                placeholder="Örn: Cheeseburger"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Fiyat (₺)</label>
                                            <Input
                                                type="number"
                                                value={editingProduct.price}
                                                onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, price: parseFloat(e.target.value) }) : null)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Kategori</label>
                                            <select
                                                className="w-full h-10 rounded-md border border-zinc-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                value={editingProduct.categoryId}
                                                onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, categoryId: e.target.value }) : null)}
                                            >
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium">Başlangıç Saati</label>
                                                {editingProduct.startTime && (
                                                    <button
                                                        onClick={() => setEditingProduct(prev => prev ? ({ ...prev, startTime: undefined }) : null)}
                                                        className="text-[10px] text-zinc-500 hover:text-red-500"
                                                    >
                                                        Sıfırla
                                                    </button>
                                                )}
                                            </div>
                                            <Input
                                                type="time"
                                                value={editingProduct.startTime ? editingProduct.startTime.substring(0, 5) : ""}
                                                onChange={(e) => {
                                                    const val = e.target.value ? `${e.target.value}:00` : undefined;
                                                    setEditingProduct(prev => prev ? ({ ...prev, startTime: val }) : null)
                                                }}
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium">Bitiş Saati</label>
                                                {editingProduct.endTime && (
                                                    <button
                                                        onClick={() => setEditingProduct(prev => prev ? ({ ...prev, endTime: undefined }) : null)}
                                                        className="text-[10px] text-zinc-500 hover:text-red-500"
                                                    >
                                                        Sıfırla
                                                    </button>
                                                )}
                                            </div>
                                            <Input
                                                type="time"
                                                value={editingProduct.endTime ? editingProduct.endTime.substring(0, 5) : ""}
                                                onChange={(e) => {
                                                    const val = e.target.value ? `${e.target.value}:00` : undefined;
                                                    setEditingProduct(prev => prev ? ({ ...prev, endTime: val }) : null)
                                                }}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mb-2 -mt-4">Belirli saatlerde servis edilen ürünler için (Örn. Oda Servisi Gece Menüsü veya Kahvaltı Tabağı). Boş bırakılırsa her zaman gösterilir.</p>

                                    {/* Discount Settings */}
                                    <div className="space-y-4 pt-4 border-t border-zinc-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <h4 className="font-medium text-sm text-zinc-700">İndirim Ayarları</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">İndirim Tipi</label>
                                                <select
                                                    className="w-full bg-zinc-50 hover:bg-white focus:bg-white border border-zinc-200 rounded-lg p-2 text-sm outline-none focus:border-primary transition-colors"
                                                    value={editingProduct.discount_type || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setEditingProduct(prev => prev ? ({ ...prev, discount_type: val === "" ? null : val as any }) : null) // eslint-disable-line @typescript-eslint/no-explicit-any
                                                    }}
                                                >
                                                    <option value="">Yok</option>
                                                    <option value="percentage">% Yüzde</option>
                                                    <option value="fixed">₺ Tutar</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">İndirim Değeri</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={editingProduct.discount_amount || ""}
                                                    onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, discount_amount: e.target.value ? parseFloat(e.target.value) : null }) : null)}
                                                    className="w-full bg-zinc-50 focus:bg-white hover:bg-white transition-colors"
                                                    disabled={!editingProduct.discount_type}
                                                    placeholder={editingProduct.discount_type === 'percentage' ? "Örn: 15" : editingProduct.discount_type === 'fixed' ? "Örn: 50" : ""}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Toggles */}
                                    <div className="flex items-center gap-6 p-4 bg-zinc-50 rounded-lg border border-zinc-100">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={!!editingProduct.isAvailable}
                                                onCheckedChange={(val) => setEditingProduct(prev => prev ? ({ ...prev, isAvailable: val }) : null)}
                                            />
                                            <label className="text-sm font-medium cursor-pointer" onClick={() => setEditingProduct(prev => prev ? ({ ...prev, isAvailable: !prev.isAvailable }) : null)}>Satışta</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={!!editingProduct.isChefRecommendation}
                                                onCheckedChange={(val) => setEditingProduct(prev => prev ? ({ ...prev, isChefRecommendation: val }) : null)}
                                                className="data-[state=checked]:bg-amber-500"
                                            />
                                            <label className="text-sm font-medium cursor-pointer" onClick={() => setEditingProduct(prev => prev ? ({ ...prev, isChefRecommendation: !prev.isChefRecommendation }) : null)}>Şefin Tavsiyesi</label>
                                        </div>
                                    </div>

                                    {/* Image Details */}
                                    <div className="flex flex-col gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium block">Ürün Görseli</label>
                                            <ImageUpload
                                                value={editingProduct.image || ""}
                                                onChange={(url) => setEditingProduct(prev => prev ? ({ ...prev, image: url }) : null)}
                                                onRemove={() => setEditingProduct(prev => prev ? ({ ...prev, image: "" }) : null)}
                                                folder="qr-menu/products"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium block">Açıklama</label>
                                            <textarea
                                                className="w-full h-24 rounded-lg border border-zinc-200 p-3 text-sm focus:border-primary outline-none resize-none bg-zinc-50 focus:bg-white transition-colors"
                                                placeholder="Ürün içeriği hakkında bilgi verin..."
                                                value={editingProduct.description || ""}
                                                onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                                            />
                                        </div>
                                    </div>

                                    {/* Allergens */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium block text-zinc-900">Alerjenler & Etiketler</label>
                                        <div className="flex flex-wrap gap-2">
                                            {allergens.map(allergen => {
                                                const isActive = editingProduct.allergens?.includes(allergen.name);
                                                return (
                                                    <button
                                                        key={allergen.id}
                                                        onClick={() => {
                                                            const current = editingProduct.allergens || [];
                                                            const newAllergens = isActive
                                                                ? current.filter(a => a !== allergen.name)
                                                                : [...current, allergen.name];
                                                            setEditingProduct(prev => prev ? ({ ...prev, allergens: newAllergens }) : null);
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5",
                                                            isActive
                                                                ? "bg-primary text-white border-primary"
                                                                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                                                        )}
                                                    >
                                                        {isActive && <Check className="h-3 w-3" />}
                                                        {allergen.name}
                                                    </button>
                                                )
                                            })}

                                            {/* Add New Allergen Button */}
                                            {isAddingAllergen ? (
                                                <div className="flex items-center gap-1 animate-in fade-in zoom-in-95">
                                                    <Input
                                                        value={newAllergen}
                                                        onChange={e => setNewAllergen(e.target.value)}
                                                        className="h-8 text-xs w-32 bg-white"
                                                        placeholder="Alerjen..."
                                                        autoFocus
                                                        onKeyDown={async e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (newAllergen.trim() && venueData) {
                                                                    const val = newAllergen.trim();
                                                                    // Check if already exists
                                                                    if (!allergens.find(a => a.name.toLowerCase() === val.toLowerCase())) {
                                                                        // Create in DB
                                                                        try {
                                                                            const created = await AllergenService.createAllergen({
                                                                                name: val,
                                                                                translations: {}
                                                                            });
                                                                            if (created) {
                                                                                setAllergens(prev => [...prev, created]);
                                                                            }
                                                                        } catch (e) {
                                                                            console.error("Failed to create allergen:", e);
                                                                        }
                                                                    }
                                                                    setEditingProduct(prev => {
                                                                        if (!prev) return null;
                                                                        const current = prev.allergens || [];
                                                                        // Prevent Duplicate
                                                                        if (current.includes(val)) return prev;
                                                                        return { ...prev, allergens: [...current, val] };
                                                                    });
                                                                    setNewAllergen("");
                                                                    setIsAddingAllergen(false);
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => setIsAddingAllergen(false)}
                                                        className="p-1 hover:bg-zinc-100 rounded-full text-zinc-500"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setIsAddingAllergen(true)}
                                                    className="px-3 py-1.5 rounded-full text-xs border border-dashed border-zinc-300 hover:border-primary hover:text-primary text-zinc-500 flex items-center gap-1 transition-colors"
                                                >
                                                    <Plus className="h-3 w-3" /> Ekle
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- TRANSLATIONS TAB --- */}
                            {modalTab === 'translations' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                                    <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                                        <p>Aşağıdaki diller için ürün adı ve açıklama çevirilerini girebilirsiniz. Boş bırakılan alanlarda varsayılan dil ({venueData?.defaultLanguage || 'TR'}) gösterilecektir.</p>
                                    </div>

                                    {(!venueData?.supportedLanguages || venueData.supportedLanguages.length <= 1) ? (
                                        <div className="text-center py-10 text-zinc-500">
                                            <Globe className="h-10 w-10 mx-auto text-zinc-300 mb-2" />
                                            <p>Ekstra dil tanımlanmamış.</p>
                                            <button
                                                onClick={() => { setIsAllergenModalOpen(false); setActiveTab('settings'); }}
                                                className="text-primary hover:underline text-sm font-medium mt-2"
                                            >
                                                Ayarlardan yeni dil ekle
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {venueData.supportedLanguages
                                                .filter(lang => lang !== (venueData.defaultLanguage || 'tr'))
                                                .map(lang => (
                                                    <div key={lang} className="border border-zinc-200 rounded-lg overflow-hidden">
                                                        <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200 flex items-center gap-2">
                                                            <span className="font-bold text-xs uppercase bg-white border px-1.5 py-0.5 rounded text-zinc-700">{lang}</span>
                                                            <span className="text-xs text-zinc-500 font-medium">Çeviri</span>
                                                        </div>
                                                        <div className="p-4 space-y-4 bg-white">
                                                            <div className="space-y-1.5">
                                                                <label className="text-xs font-medium text-zinc-500">Ürün Adı ({lang.toUpperCase()})</label>
                                                                <Input
                                                                    value={editingProduct.translations?.[lang]?.name || ""}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setEditingProduct(prev => {
                                                                            if (!prev) return null;
                                                                            const newTrans = { ...prev.translations };
                                                                            newTrans[lang] = { ...newTrans[lang], name: val };
                                                                            return { ...prev, translations: newTrans };
                                                                        });
                                                                    }}
                                                                    placeholder={`${editingProduct.name} için çeviri...`}
                                                                    className="h-9"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-xs font-medium text-zinc-500">Açıklama ({lang.toUpperCase()})</label>
                                                                <textarea
                                                                    className="w-full h-20 rounded-md border border-zinc-200 p-2 text-sm focus:border-primary outline-none resize-none bg-zinc-50 focus:bg-white transition-colors"
                                                                    placeholder={`${lang.toUpperCase()} açıklaması...`}
                                                                    value={editingProduct.translations?.[lang]?.description || ""}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setEditingProduct(prev => {
                                                                            if (!prev) return null;
                                                                            const newTrans = { ...prev.translations };
                                                                            newTrans[lang] = { ...newTrans[lang], description: val };
                                                                            return { ...prev, translations: newTrans };
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                        <div className="p-4 bg-zinc-50 flex justify-end gap-2 sticky bottom-0 border-t border-zinc-100">
                            <Button variant="ghost" onClick={() => setIsAllergenModalOpen(false)}>İptal</Button>
                            <Button onClick={async () => {
                                if (editingProduct.id === 'new') {
                                    // Create
                                    try {
                                        const created = await ProductService.createProduct(editingProduct);
                                        if (created) {
                                            setProducts(prev => [...prev, created]);
                                        }
                                        setIsAllergenModalOpen(false);
                                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    } catch (_err) { alert("Oluşturulamadı"); }
                                } else {
                                    // Update
                                    try {
                                        const productId = editingProduct.id!;
                                        await ProductService.updateProduct(productId, editingProduct);

                                        // Update local state
                                        // We assume success if no error thrown
                                        setProducts(prev => prev.map(p => p.id === productId ? (editingProduct as Product) : p));

                                        setIsAllergenModalOpen(false);
                                    } catch (e) {
                                        console.error(e);
                                        alert("Güncellenemedi");
                                    }
                                }
                            }}>Kaydet</Button>

                        </div>
                    </div>
                </div>
            )
            }
            {/* Category Edit Modal */}
            {
                isCategoryModalOpen && editingCategory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between px-4 pt-4 pb-0 bg-white z-10">
                                <h3 className="font-bold text-lg text-zinc-900">
                                    {editingCategory.id === 'new' ? 'Yeni Kategori' : 'Kategori Düzenle'}
                                </h3>
                                <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex border-b border-zinc-100 px-4 mt-2">
                                <button
                                    onClick={() => setCategoryModalTab('general')}
                                    className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", categoryModalTab === 'general' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-700")}
                                >
                                    Genel Bilgiler
                                </button>
                                <button
                                    onClick={() => setCategoryModalTab('translations')}
                                    className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", categoryModalTab === 'translations' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-700")}
                                >
                                    Çeviriler
                                    <span className={cn("ml-2 text-[10px] px-1.5 py-0.5 rounded-full", venueData?.supportedLanguages?.length && venueData.supportedLanguages.length > 1 ? "bg-primary/10 text-primary" : "bg-zinc-100 text-zinc-400")}>
                                        {(venueData?.supportedLanguages?.length || 1) - 1}
                                    </span>
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {categoryModalTab === 'general' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-200">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Kategori Adı</label>
                                                <Input
                                                    value={editingCategory.name}
                                                    onChange={(e) => setEditingCategory(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                                                    placeholder="Örn: Ana Yemekler"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Bağlı Olduğu Üst Kategori</label>
                                                <select
                                                    value={editingCategory.parentId || ''}
                                                    onChange={(e) => setEditingCategory(prev => prev ? ({ ...prev, parentId: e.target.value || null }) : null)}
                                                    className="w-full h-10 px-3 rounded-md border border-input bg-white text-zinc-900 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                                >
                                                    <option value="">(Ana Kategori)</option>
                                                    {treeSortedCategories
                                                        .filter(c => c.id !== editingCategory.id && !wouldCreateCircle(editingCategory.id, c.id, categories))
                                                        .map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {getCategoryBreadcrumb(c.id, categories)}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Başlangıç Saati</label>
                                                <Input
                                                    type="time"
                                                    value={editingCategory.startTime ? editingCategory.startTime.substring(0, 5) : ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value ? `${e.target.value}:00` : undefined;
                                                        setEditingCategory(prev => prev ? ({ ...prev, startTime: val }) : null)
                                                    }}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Bitiş Saati</label>
                                                <Input
                                                    type="time"
                                                    value={editingCategory.endTime ? editingCategory.endTime.substring(0, 5) : ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value ? `${e.target.value}:00` : undefined;
                                                        setEditingCategory(prev => prev ? ({ ...prev, endTime: val }) : null)
                                                    }}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-zinc-500 mb-2">Boş bırakılırsa her zaman gösterilir. (Örn: Kahvaltı için 06:00 - 12:00)</p>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Kategori Görseli (Küçük İkon)</label>
                                            <ImageUpload
                                                value={editingCategory.image || ""}
                                                onChange={(url) => setEditingCategory(prev => prev ? ({ ...prev, image: url }) : null)}
                                                onRemove={() => setEditingCategory(prev => prev ? ({ ...prev, image: "" }) : null)}
                                                folder="qr-menu/categories"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Kapak Görseli (Cover)</label>
                                            <p className="text-[10px] text-zinc-500 mb-1">Kategori ürünlerinin üzerinde geniş banner olarak görünür.</p>
                                            <ImageUpload
                                                value={editingCategory.coverImage || ""}
                                                onChange={(url) => setEditingCategory(prev => prev ? ({ ...prev, coverImage: url }) : null)}
                                                onRemove={() => setEditingCategory(prev => prev ? ({ ...prev, coverImage: "" }) : null)}
                                                folder="qr-menu/categories/covers"
                                            />
                                        </div>
                                    </div>
                                )}

                                {categoryModalTab === 'translations' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                                        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                                            <p>Kategori adı çevirilerini buradan yönetebilirsiniz.</p>
                                        </div>

                                        {(!venueData?.supportedLanguages || venueData.supportedLanguages.length <= 1) ? (
                                            <div className="text-center py-8 text-zinc-500">
                                                <p>Ekstra dil tanımlanmamış.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {venueData.supportedLanguages
                                                    .filter(lang => lang !== (venueData.defaultLanguage || 'tr'))
                                                    .map(lang => (
                                                        <div key={lang} className="space-y-1.5">
                                                            <label className="text-xs font-medium text-zinc-500 uppercase flex items-center gap-2">
                                                                <span>{lang}</span>
                                                                <span className="h-px bg-zinc-200 flex-1"></span>
                                                            </label>
                                                            <Input
                                                                value={editingCategory.translations?.[lang]?.name || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setEditingCategory(prev => {
                                                                        if (!prev) return null;
                                                                        const newTrans = { ...(prev.translations || {}) };
                                                                        // Ensure object exists
                                                                        if (!newTrans[lang]) newTrans[lang] = {};
                                                                        newTrans[lang] = { ...newTrans[lang], name: val };
                                                                        return { ...prev, translations: newTrans };
                                                                    });
                                                                }}
                                                                placeholder={`${lang.toUpperCase()} çevirisi...`}
                                                            />
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-zinc-50 flex justify-end gap-2 border-t border-zinc-100">
                                <Button variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>İptal</Button>
                                <Button onClick={handleSaveCategory}>Kaydet</Button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
}
