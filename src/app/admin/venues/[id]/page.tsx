"use client";

import { use, useState, useEffect, useCallback } from "react";
import { Venue, Product, Category } from "@/data/db";
import { DbService } from "@/services/db-service";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { ArrowLeft, Save, Plus, Trash2, Image as ImageIcon, Loader2, Star, Edit2, MoreHorizontal, X, Check, Search as SearchIcon } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import ProductImporter from "@/components/admin/ProductImporter";

// Mock Allergens List
const ALLERGENS_LIST = [
    "Gluten", "Yumurta", "Süt", "Hardal", "Yer Fıstığı", "Soya", "Balık", "Kabuklu Deniz Ürünleri", "Kereviz"
];

export default function VenueEditor({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Data States
    const [venueData, setVenueData] = useState<Venue | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // Dirty State (Track changes)
    const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set()); // Product IDs that changed
    const [venueSettingsChanged, setVenueSettingsChanged] = useState(false);

    // UI States
    const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'settings'>('products');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null); // For Details Modal
    const [isAllergenModalOpen, setIsAllergenModalOpen] = useState(false);

    // Load Data
    useEffect(() => {
        async function load() {
            setLoading(true);
            const data = await DbService.getVenueById(unwrappedParams.id);
            if (data) {
                setVenueData(data);
                setProducts(data.products || []);
                setCategories(data.categories || []);
            }
            setLoading(false);
        }
        load();
    }, [unwrappedParams.id]);

    // --- Handlers ---

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

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            // 1. Save Venue Settings if changed
            if (venueSettingsChanged && venueData) {
                await DbService.updateVenue(venueData.id, {
                    name: venueData.name,
                    theme: venueData.theme,
                    coverImage: venueData.coverImage
                });
                setVenueSettingsChanged(false);
            }

            // 2. Save Modified Products
            if (unsavedChanges.size > 0) {
                const promises = Array.from(unsavedChanges).map(async (prodId) => {
                    const product = products.find(p => p.id === prodId);
                    if (product) {
                        // Construct update object safely
                        const updatePayload: any = {
                            name: product.name,
                            price: product.price,
                            description: product.description,
                            categoryId: product.categoryId,
                            isAvailable: product.isAvailable,
                            isChefRecommendation: product.isChefRecommendation,
                            allergens: product.allergens,
                            image: product.image
                            // Add other fields as necessary
                        };
                        await DbService.updateProduct(prodId, updatePayload);
                    }
                });
                await Promise.all(promises);
                setUnsavedChanges(new Set());
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
            const created = await DbService.createProduct(newProduct);
            if (created) {
                setProducts(prev => [...prev, created]);
            }
        } catch (err) {
            console.error(err);
            alert("Ürün oluşturulamadı.");
        }
    };

    const handleCreateCategory = async () => {
        if (!venueData) return;
        const name = window.prompt("Kategori Adı:");
        if (!name) return;

        try {
            const created = await DbService.createCategory({ venueId: venueData.id, name });
            if (created) {
                setCategories(prev => [...prev, created]);
            }
        } catch (err) {
            console.error(err);
            alert("Kategori oluşturulamadı.");
        }
    };

    const handleEditCategory = async (cat: Category) => {
        const newName = window.prompt("Yeni kategori adı:", cat.name);
        if (newName && newName !== cat.name) {
            try {
                await DbService.updateCategory(cat.id, newName);
                // Update local
                setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, name: newName } : c));
            } catch (e) {
                alert("Kategori güncellenemedi.");
            }
        }
    };

    const handleDeleteCategory = async (catId: string) => {
        const hasProducts = products.some(p => p.categoryId === catId);
        if (hasProducts) {
            alert("Bu kategoride ürünler var. Önce ürünleri silin veya taşıyın.");
            return;
        }
        if (!window.confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;

        try {
            await DbService.deleteCategory(catId);
            setCategories(prev => prev.filter(c => c.id !== catId));
        } catch (e) {
            alert("Silme işlemi başarısız.");
        }
    };

    const handleDeleteProduct = async (prodId: string) => {
        if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
        try {
            await DbService.deleteProduct(prodId);
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

    const handleImportProducts = async (importedData: any[]) => {
        if (!venueData) return;
        setLoading(true);

        try {
            let newProductsCount = 0;

            // Process sequentially to handle category creation properly
            for (const item of importedData) {

                // 1. Find or Create Category
                let categoryId = categories.find(c => c.name.toLowerCase() === item.categoryName.toLowerCase())?.id;

                if (!categoryId) {
                    const newCat = await DbService.createCategory({
                        venueId: venueData.id,
                        name: item.categoryName
                    });
                    if (newCat) {
                        categoryId = newCat.id;
                        // Update local state so next items can find it
                        setCategories(prev => [...prev, newCat]);
                    }
                }

                if (categoryId) {
                    // 2. Create Product
                    await DbService.createProduct({
                        venueId: venueData.id,
                        categoryId: categoryId,
                        name: item.name,
                        description: item.description,
                        price: item.price,
                        isAvailable: item.isAvailable, // Default true from importer
                        isChefRecommendation: item.isChefRecommendation,
                        allergens: item.allergens
                    });
                    newProductsCount++;
                }
            }

            alert(`${newProductsCount} ürün başarıyla eklendi!`);

            // Refresh Data
            const freshData = await DbService.getVenueById(venueData.id);
            if (freshData) {
                setProducts(freshData.products);
                setCategories(freshData.categories);
            }

        } catch (err) {
            console.error("Import failed:", err);
            alert("İçe aktarma sırasında bir hata oluştu.");
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
                "Ürün Adı": p.name,
                "Açıklama": p.description,
                "Fiyat": p.price,
                "Kategori": catName,
                "Alerjenler": p.allergens ? p.allergens.join(", ") : "",
                "Şef": p.isChefRecommendation ? "Evet" : "Hayır",
                "Durum": p.isAvailable ? "Aktif" : "Pasif"
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Menü");
        XLSX.writeFile(wb, `${venueData?.name || "menu"}_export.xlsx`);
    };

    const openAllergenModal = (product: Product) => {
        setEditingProduct(product);
        setIsAllergenModalOpen(true);
    };


    if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-900">Yükleniyor...</div>;
    if (!venueData) return <div>Mekan bulunamadı.</div>;

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                </div>
            </div>

            {/* Content Area */}

            {/* 1. PRODUCTS TAB */}
            {activeTab === 'products' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="relative w-72">
                            <Input
                                placeholder="Ürün Ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-white text-zinc-900"
                            />
                            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                        </div>

                        <div className="flex gap-2">
                            <ProductImporter onImport={handleImportProducts} onExport={handleExportProducts} />
                            <Button onClick={handleCreateProduct}>
                                <Plus className="h-4 w-4 mr-2" />
                                Yeni Ürün
                            </Button>
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
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className={cn("transition-colors group", unsavedChanges.has(product.id) ? "bg-amber-50/40" : "hover:bg-zinc-50/50")}>

                                        {/* Image */}
                                        <td className="px-6 py-4">
                                            <div className="h-10 w-10 rounded bg-zinc-100 relative overflow-hidden border border-zinc-200">
                                                {product.image ? (
                                                    <Image src={product.image} alt={product.name} fill className="object-cover" />
                                                ) : (
                                                    <ImageIcon className="h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-300" />
                                                )}
                                            </div>
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
                                                    {product.allergens.map(a => (
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
                    </div>
                </div>
            )}

            {/* 2. CATEGORIES TAB */}
            {activeTab === 'categories' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((cat) => (
                        <Card key={cat.id} className="group hover:border-primary/50 transition-colors cursor-pointer bg-white">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-12 w-12 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400">
                                    {/* Category Image would go here */}
                                    <MoreHorizontal className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-zinc-900">{cat.name}</div>
                                    <div className="text-xs text-zinc-500">{products.filter(p => p.categoryId === cat.id).length} Ürün</div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditCategory(cat)}>
                                        <Edit2 className="h-4 w-4 text-zinc-500" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => handleDeleteCategory(cat.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Kapak Görseli</label>
                                <ImageUpload
                                    value={venueData.coverImage || ""}
                                    onChange={(url) => handleVenueChange('coverImage', url)}
                                    onRemove={() => handleVenueChange('coverImage', "")}
                                    folder="qr-menu/venues"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Mekan Adı</label>
                                    <Input value={venueData.name} onChange={(e) => handleVenueChange('name', e.target.value)} className="bg-white text-zinc-900" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tema Rengi</label>
                                    <div className="flex gap-2">
                                        <div className="h-10 w-10 rounded border shrink-0" style={{ backgroundColor: venueData.theme?.primary }} />
                                        <Input value={venueData.theme?.primary} onChange={(e) => handleVenueChange('theme', { primary: e.target.value })} className="bg-white text-zinc-900" />
                                    </div>
                                </div>
                            </div>

                            {/* Save button is now in sticky header, but we can keep one here too */}
                            {/* <Button onClick={handleSaveAll} disabled={saving} className="w-full">
                            {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Ayarları Kaydet
                        </Button> */}
                            <div className="text-sm text-zinc-500 italic">
                                Değişiklikleri kaydetmek için yukarıdaki "Kaydet" butonunu kullanın.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Product Detail / Allergen Modal */}
            {isAllergenModalOpen && editingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
                            <h3 className="font-bold text-lg text-zinc-900">{editingProduct.name} - Detaylar</h3>
                            <button onClick={() => setIsAllergenModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">

                            {/* Image Details */}
                            <div className="flex flex-col gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium block">Ürün Görseli</label>
                                    <div className="flex items-center gap-4">
                                        <ImageUpload
                                            value={editingProduct.image}
                                            onChange={(url) => {
                                                handleProductChange(editingProduct.id, 'image', url);
                                            }}
                                            onRemove={() => {
                                                handleProductChange(editingProduct.id, 'image', '');
                                            }}
                                            folder="qr-menu/products"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium block">Açıklama</label>
                                    <textarea
                                        className="w-full h-24 rounded-lg border border-zinc-200 p-3 text-sm focus:border-primary outline-none resize-none bg-zinc-50 focus:bg-white transition-colors"
                                        placeholder="Ürün içeriği hakkında bilgi verin..."
                                        value={editingProduct.description}
                                        onChange={(e) => handleProductChange(editingProduct.id, 'description', e.target.value)}
                                    />
                                </div>
                            </div>


                            <div className="space-y-3">
                                <label className="text-sm font-medium block text-zinc-900">Alerjenler & Etiketler</label>
                                <div className="flex flex-wrap gap-2">
                                    {ALLERGENS_LIST.map(allergen => {
                                        const isActive = editingProduct.allergens?.includes(allergen);
                                        return (
                                            <button
                                                key={allergen}
                                                onClick={() => {
                                                    const current = editingProduct.allergens || [];
                                                    const newAllergens = isActive
                                                        ? current.filter(a => a !== allergen)
                                                        : [...current, allergen];
                                                    handleProductChange(editingProduct.id, 'allergens', newAllergens);
                                                }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5",
                                                    isActive
                                                        ? "bg-primary text-white border-primary"
                                                        : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                                                )}
                                            >
                                                {isActive && <Check className="h-3 w-3" />}
                                                {allergen}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-zinc-50 flex justify-end sticky bottom-0 border-t border-zinc-100">
                            <Button onClick={() => setIsAllergenModalOpen(false)}>Tamam</Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
