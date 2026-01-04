import React, { useState } from 'react';
import { Allergen, Product } from '@/data/db';
import { DbService } from '@/services/db-service';
import { Trash2, Plus, Globe, Check, X, AlertCircle } from 'lucide-react';
import { AuditService } from '@/services/audit-service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface AllergenManagerProps {
    allergens: Allergen[];
    products: Product[];
    supportedLanguages: string[];
    defaultLanguage: string;
    onUpdate: () => void; // Parent should re-fetch venue
}

export function AllergenManager({ allergens, products, supportedLanguages, defaultLanguage, onUpdate }: AllergenManagerProps) {
    const [newAllergenName, setNewAllergenName] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editTranslations, setEditTranslations] = useState<Record<string, { name: string }>>({});

    const handleCreate = async () => {
        if (!newAllergenName.trim()) return;
        setIsCreating(true);
        try {
            await DbService.createAllergen({
                name: newAllergenName.trim(),
                translations: {}
            });
            setNewAllergenName("");
            onUpdate();
        } catch (e) {
            alert("Alerjen oluşturulamadı.");
        } finally {
            setIsCreating(false);
        }
    };

    const startEditing = (allergen: Allergen) => {
        setEditingId(allergen.id);
        setEditName(allergen.name);
        setEditTranslations(allergen.translations || {});
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName("");
        setEditTranslations({});
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        try {
            await DbService.updateAllergen(editingId, {
                name: editName,
                translations: editTranslations
            });

            setEditingId(null);
            onUpdate();
        } catch (e) {
            alert("Güncelleme başarısız.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu alerjeni silmek istediğinize emin misiniz?")) return;
        try {
            const toDelete = allergens.find(a => a.id === id);
            await DbService.deleteAllergen(id);
            onUpdate();
        } catch (e) {
            alert("Silme başarısız.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-primary" /> Alerjen Yönetimi
                </h2>
                <p className="text-sm text-zinc-500 mb-6">
                    Müşterilerinizi bilgilendirmek için alerjen listesi oluşturun. Ürünlere bu listeden etiket atayabilirsiniz.
                    Çoklu dil desteği sayesinde her dil için çeviri girebilirsiniz.
                </p>

                {/* Create New */}
                <div className="flex gap-2 max-w-md mb-8">
                    <Input
                        placeholder="Yeni alerjen adı (Örn: Gluten)"
                        value={newAllergenName}
                        onChange={e => setNewAllergenName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    />
                    <Button onClick={handleCreate} disabled={isCreating || !newAllergenName.trim()}>
                        <Plus className="h-4 w-4 mr-2" /> Ekle
                    </Button>
                </div>

                {/* List */}
                <div className="space-y-2">
                    {allergens.map(allergen => (
                        <div key={allergen.id} className="group flex flex-col border border-zinc-100 rounded-lg bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all">

                            {/* Header / Main Row */}
                            <div className="p-3 flex items-center justify-between">
                                {editingId === allergen.id ? (
                                    <div className="flex-1 flex gap-2">
                                        <Input
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="h-8 max-w-[200px]"
                                            autoFocus
                                        />
                                        <Button size="sm" onClick={handleSaveEdit} className="h-8 bg-green-600 hover:bg-green-700 text-white"><Check className="h-4 w-4" /></Button>
                                        <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-8"><X className="h-4 w-4" /></Button>
                                    </div>
                                ) : (
                                    <div className="flex-1 font-medium text-zinc-800 flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <span>{allergen.name}</span>
                                            {/* Show translation status badges */}
                                            <div className="flex gap-1">
                                                {supportedLanguages.filter(l => l !== defaultLanguage).map(lang => (
                                                    <span key={lang} className={cn(
                                                        "text-[9px] px-1 rounded border uppercase font-normal",
                                                        allergen.translations?.[lang]?.name ? "bg-green-50 text-green-600 border-green-200" : "bg-zinc-100 text-zinc-400 border-zinc-200"
                                                    )}>
                                                        {lang}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-xs text-zinc-500 flex items-center gap-1">
                                            <span>({products.filter(p => p.allergens?.includes(allergen.name)).length} üründe)</span>
                                            {products.filter(p => p.allergens?.includes(allergen.name)).length > 0 && (
                                                <span className="text-[10px] text-zinc-400 truncate max-w-[300px]" title={products.filter(p => p.allergens?.includes(allergen.name)).map(p => p.name).join(', ')}>
                                                    — {products.filter(p => p.allergens?.includes(allergen.name)).map(p => p.name).join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => startEditing(allergen)}>
                                        Düzenle / Çevir
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50" onClick={() => handleDelete(allergen.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Translations Editing Area (If Editing) */}
                            {editingId === allergen.id && supportedLanguages.length > 1 && (
                                <div className="p-3 bg-zinc-50 border-t border-zinc-200 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                                    {supportedLanguages.filter(l => l !== defaultLanguage).map(lang => (
                                        <div key={lang} className="flex items-center gap-2">
                                            <span className="w-8 text-xs font-bold uppercase text-zinc-500 text-right">{lang}</span>
                                            <Input
                                                className="h-8 text-sm"
                                                placeholder={`${lang.toUpperCase()} çevirisi`}
                                                value={editTranslations[lang]?.name || ""}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setEditTranslations(prev => ({
                                                        ...prev,
                                                        [lang]: { ...prev[lang], name: val }
                                                    }));
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {allergens.length === 0 && (
                        <div className="text-center py-10 text-zinc-400 text-sm">
                            Henüz alerjen eklenmemiş.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
