"use client";

import { use, useState, useEffect } from "react";
import { venues, Venue, Product } from "@/data/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, Save, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function VenueEditor({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    const [venue, setVenue] = useState<Venue | null>(null);

    useEffect(() => {
        // Mock fetch
        const found = venues.find(v => v.id === unwrappedParams.id);
        if (found) setVenue(found);
    }, [unwrappedParams.id]);

    if (!venue) return <div>Yükleniyor...</div>;

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">{venue.name}</h1>
                        <p className="text-zinc-500 text-sm">Menü ve i̇çerik yönetimi</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Önizle</Button>
                    <Button className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Değişiklikleri Kaydet
                    </Button>
                </div>
            </div>

            {/* Tabs / Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar Settings */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Genel Bilgiler</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mekan Adı</label>
                                <Input defaultValue={venue.name} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Slug (URL)</label>
                                <Input defaultValue={venue.slug} disabled className="bg-zinc-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Temel Renk (Primary)</label>
                                <div className="flex gap-2">
                                    <div className="h-10 w-10 rounded border" style={{ backgroundColor: venue.theme.primary }}></div>
                                    <Input defaultValue={venue.theme.primary} className="font-mono uppercase" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Kategoriler</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {venue.categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-2 bg-zinc-50 rounded border border-zinc-100 group">
                                    <span className="font-medium text-sm">{cat.name}</span>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" className="w-full mt-2 border-dashed">
                                <Plus className="h-3 w-3 mr-2" />
                                Kategori Ekle
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content - Products */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">Ürün Listesi</h2>
                        <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Ürün Ekle
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {venue.products.map(product => (
                            <div key={product.id} className="flex gap-4 p-4 bg-white rounded-xl border border-zinc-100 shadow-sm hover:border-primary/20 transition-colors">
                                {/* Image */}
                                <div className="h-20 w-20 bg-zinc-100 rounded-lg relative overflow-hidden shrink-0">
                                    {product.image ? (
                                        <Image src={product.image} alt={product.name} fill className="object-cover" />
                                    ) : (
                                        <ImageIcon className="h-8 w-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-300" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-zinc-900">{product.name}</h3>
                                        <span className="font-bold text-zinc-900">{product.price} ₺</span>
                                    </div>
                                    <p className="text-sm text-zinc-500 mt-1 line-clamp-1">{product.description}</p>

                                    <div className="flex items-center gap-2 mt-3">
                                        {product.labels?.map(l => (
                                            <span key={l} className="text-[10px] px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded uppercase font-bold">{l}</span>
                                        ))}
                                        <div className="flex-1" />
                                        <Button variant="ghost" size="sm" className="h-7 text-zinc-500 hover:text-primary">Düzenle</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
