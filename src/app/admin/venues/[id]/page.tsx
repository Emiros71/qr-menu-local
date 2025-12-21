"use client";

import { use, useState, useEffect } from "react";
import { Venue, Product, Category } from "@/data/db";
import { DbService } from "@/services/db-service";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { ArrowLeft, Save, Plus, Trash2, Image as ImageIcon, Loader2, Star, Edit2, MoreHorizontal, X, Check, AlignLeft } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Mock Allergens List
const ALLERGENS_LIST = [
    "Gluten", "Yumurta", "Süt", "Hardal", "Yer Fıstığı", "Soya", "Balık", "Kabuklu Deniz Ürünleri", "Kereviz"
];

export default function VenueEditor({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    const [venue, setVenue] = useState<Venue | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // States
    const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'settings'>('products');
    const [searchQuery, setSearchQuery] = useState("");
    const [editingProduct, setEditingProduct] = useState<Product | null>(null); // For Details Modal
    const [isAllergenModalOpen, setIsAllergenModalOpen] = useState(false);

    // Edit States
    const [venueName, setVenueName] = useState("");
    const [themeColor, setThemeColor] = useState("");
    const [coverImage, setCoverImage] = useState("");

    useEffect(() => {
        async function load() {
            setLoading(true);
            const data = await DbService.getVenueById(unwrappedParams.id);
            if (data) {
                setVenue(data);
                setVenueName(data.name);
                setThemeColor(data.theme.primary);
                setCoverImage(data.coverImage || "");
            }
            setLoading(false);
        }
        load();
    }, [unwrappedParams.id]);

    const handleSaveVenue = async () => {
        if (!venue) return;
        setSaving(true);
        try {
            await DbService.updateVenue(venue.id, {
                name: venueName,
                theme: { ...venue.theme, primary: themeColor },
                coverImage: coverImage
            });
            alert("Genel ayarlar kaydedildi!");
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateProduct = async () => {
        if (!venue) return;
        const confirm = window.confirm("Yeni bir ürün oluşturulsun mu?");
        if (!confirm) return;

        const newProduct = {
            name: "Yeni Ürün",
            description: "", // Now empty by default
            price: 100,
            isAvailable: true,
            venueId: venue.id,
            categoryId: venue.categories[0]?.id, // Default to first category
            image: ""
        };

        try {
            const created = await DbService.createProduct(newProduct);
            if (created) {
                setVenue({ ...venue, products: [...venue.products, created] });
            }
        } catch (err) {
            console.error(err);
            alert("Ürün oluşturulamadı.");
        }
    };

    const handleCreateCategory = async () => {
        if (!venue) return;
        const name = window.prompt("Kategori Adı:");
        if (!name) return;

        try {
            const created = await DbService.createCategory({ venueId: venue.id, name });
            if (created) {
                setVenue({ ...venue, categories: [...venue.categories, created] });
            }
        } catch (err) {
            console.error(err);
            alert("Kategori oluşturulamadı.");
        }
    };

    const updateProductField = async (productId: string, field: string, value: any) => {
        if (!venue) return;
        // Optimistic
        const updatedProducts = venue.products.map(p =>
            p.id === productId ? { ...p, [field]: value } : p
        );
        setVenue({ ...venue, products: updatedProducts });

        // DB
        try {
            await DbService.updateProduct(productId, { [field]: value });
        } catch (err) {
            console.error(err);
        }
    };

    const openAllergenModal = (product: Product) => {
        setEditingProduct(product);
        setIsAllergenModalOpen(true);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-900">Yükleniyor...</div>;
    if (!venue) return <div>Mekan bulunamadı.</div>;

    const filteredProducts = venue.products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20 text-zinc-900">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-200">
                        {coverImage ? <Image src={coverImage} alt="Cover" width={48} height={48} className="object-cover w-full h-full" /> : <StoreIcon className="h-6 w-6 text-zinc-300" />}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">{venueName}</h1>
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            Aktif • {venue.products.length} Ürün • {venue.categories.length} Kategori
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/${venue.slug}`} target="_blank">
                        <Button variant="outline">Önizle</Button>
                    </Link>
                    <Link href="/admin">
                        <Button variant="ghost">Geri Dön</Button>
                    </Link>
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
            {activeTab === 'products' && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex justify-between items-center">
                        <div className="relative w-72">
                            <Input
                                placeholder="Ürün Ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-white text-zinc-900"
                            />
                            {/* Search Icon mock */}
                            <div className="absolute left-3 top-2.5 text-zinc-400">🔍</div>
                        </div>
                        <Button onClick={handleCreateProduct}>
                            <Plus className="h-4 w-4 mr-2" />
                            Yeni Ürün
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 border-b border-zinc-200">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-zinc-500 w-16">Görsel</th>
                                    <th className="px-6 py-3 font-medium text-zinc-500">Ürün Adı</th>
                                    <th className="px-6 py-3 font-medium text-zinc-500">Kategori</th>
                                    <th className="px-6 py-3 font-medium text-zinc-500">Fiyat</th>
                                    <th className="px-6 py-3 font-medium text-zinc-500 text-center">Şefin Tavsiyesi</th>
                                    <th className="px-6 py-3 font-medium text-zinc-500 text-center">Durum</th>
                                    <th className="px-6 py-3 font-medium text-zinc-500 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-zinc-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="h-10 w-10 rounded bg-zinc-100 relative overflow-hidden border border-zinc-200">
                                                {product.image ? (
                                                    <Image src={product.image} alt={product.name} fill className="object-cover" />
                                                ) : (
                                                    <ImageIcon className="h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-300" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-zinc-900">
                                            <input
                                                className="bg-transparent focus:bg-white border border-transparent focus:border-primary/20 rounded px-1 py-0.5 outline-none w-full text-zinc-900"
                                                value={product.name}
                                                onChange={(e) => updateProductField(product.id, 'name', e.target.value)}
                                            />
                                            {/* Description is now editable in modal, but shown here as preview */}
                                            <div className="text-zinc-400 text-xs mt-0.5 flex items-center gap-1 cursor-pointer hover:text-primary" onClick={() => openAllergenModal(product)}>
                                                {product.description || "Açıklama Ekle..."}
                                                <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                            </div>

                                            {/* Allergens Badges */}
                                            {product.allergens && product.allergens.length > 0 && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    {product.allergens.map(a => (
                                                        <span key={a} className="text-[10px] px-1 bg-amber-50 text-amber-700 border border-amber-100 rounded">{a}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-600">
                                            <select
                                                className="bg-transparent outline-none cursor-pointer hover:text-zinc-900"
                                                value={product.categoryId}
                                                onChange={(e) => updateProductField(product.id, 'categoryId', e.target.value)}
                                            >
                                                {venue.categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                <input
                                                    className="bg-transparent focus:bg-white border border-transparent focus:border-primary/20 rounded px-1 py-0.5 outline-none w-20 text-right font-mono text-zinc-900"
                                                    type="number"
                                                    value={product.price}
                                                    onChange={(e) => updateProductField(product.id, 'price', parseFloat(e.target.value))}
                                                />
                                                <span className="text-zinc-500">₺</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => updateProductField(product.id, 'isChefRecommendation', !product.isChefRecommendation)}
                                                className={cn("p-1 rounded-full transition-colors", product.isChefRecommendation ? "text-amber-400 bg-amber-50" : "text-zinc-300 hover:text-zinc-400")}
                                                title="Şefin Tavsiyesi Yap"
                                            >
                                                <Star className={cn("h-5 w-5", product.isChefRecommendation && "fill-current")} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Switch
                                                    checked={product.isAvailable}
                                                    onCheckedChange={(val) => updateProductField(product.id, 'isAvailable', val)}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openAllergenModal(product)}>
                                                <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredProducts.length === 0 && (
                            <div className="p-10 text-center text-zinc-500">
                                Aradığınız kriterde ürün bulunamadı.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'categories' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {venue.categories.map((cat) => (
                        <Card key={cat.id} className="group hover:border-primary/50 transition-colors cursor-pointer bg-white">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-12 w-12 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400">
                                    {/* Category Image would go here */}
                                    <Menu className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-zinc-900">{cat.name}</div>
                                    <div className="text-xs text-zinc-500">{venue.products.filter(p => p.categoryId === cat.id).length} Ürün</div>
                                </div>
                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                    <Edit2 className="h-4 w-4" />
                                </Button>
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

            {activeTab === 'settings' && (
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
                                    value={coverImage}
                                    onChange={setCoverImage}
                                    onRemove={() => setCoverImage("")}
                                    folder="qr-menu/venues"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Mekan Adı</label>
                                    <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} className="bg-white text-zinc-900" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tema Rengi</label>
                                    <div className="flex gap-2">
                                        <div className="h-10 w-10 rounded border shrink-0" style={{ backgroundColor: themeColor }} />
                                        <Input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="bg-white text-zinc-900" />
                                    </div>
                                </div>
                            </div>

                            <Button onClick={handleSaveVenue} disabled={saving} className="w-full">
                                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Ayarları Kaydet
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Product Detail / Allergen Modal */}
            {isAllergenModalOpen && editingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
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
                                                updateProductField(editingProduct.id, 'image', url);
                                                setEditingProduct({ ...editingProduct, image: url });
                                            }}
                                            onRemove={() => {
                                                updateProductField(editingProduct.id, 'image', '');
                                                setEditingProduct({ ...editingProduct, image: '' });
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
                                        onChange={(e) => {
                                            updateProductField(editingProduct.id, 'description', e.target.value);
                                            setEditingProduct({ ...editingProduct, description: e.target.value });
                                        }}
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
                                                    updateProductField(editingProduct.id, 'allergens', newAllergens);
                                                    // Update local state implicitly via parent re-render or explicit local set
                                                    setEditingProduct({ ...editingProduct, allergens: newAllergens });
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
                        <div className="p-4 bg-zinc-50 flex justify-end">
                            <Button onClick={() => setIsAllergenModalOpen(false)}>Tamam</Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

function StoreIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" /><path d="M2 7h20" /><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" /></svg>
    )
}
function Menu({ className }: { className?: string }) {
    return (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>)
}
