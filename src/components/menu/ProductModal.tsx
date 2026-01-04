"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Product } from "@/data/db";

interface ProductModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    localize: (obj: any, field: string) => string;
    localizeAllergen: (name: string) => string;
    currencySymbol?: string;
    defaultImage: string;
}

export default function ProductModal({
    product,
    isOpen,
    onClose,
    localize,
    localizeAllergen,
    currencySymbol = "₺",
    defaultImage
}: ProductModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !product) return null;

    // Use portal to render at root level
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-md"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Product Image */}
                <div className="relative w-full h-64 md:h-80 shrink-0 bg-zinc-100">
                    <Image
                        src={product.image || defaultImage}
                        alt={localize(product, 'name')}
                        fill
                        className={`object-cover ${!product.image ? 'p-8 opacity-50' : ''}`}
                    />
                </div>

                {/* Details */}
                <div className="p-6 overflow-y-auto">
                    <div className="flex justify-between items-start gap-4 mb-2">
                        <h2 className="text-2xl font-bold text-zinc-900 leading-tight">
                            {localize(product, 'name')}
                        </h2>
                        <span className="text-xl font-bold text-primary whitespace-nowrap">
                            {currencySymbol}{product.price}
                        </span>
                    </div>

                    <p className="text-zinc-600 leading-relaxed mb-6">
                        {localize(product, 'description')}
                    </p>

                    {/* Allergens */}
                    {product.allergens && product.allergens.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-zinc-900 mb-2 uppercase tracking-wide opacity-70">
                                Alerjenler & İçerik
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {product.allergens.map(allergen => (
                                    <span
                                        key={allergen}
                                        className="text-xs px-3 py-1.5 bg-zinc-50 text-zinc-700 rounded-md border border-zinc-200 font-medium flex items-center gap-1.5 shadow-sm"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                                        {localizeAllergen(allergen)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Meta / Badges */}
                    <div className="flex gap-2">
                        {product.isChefRecommendation && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
                                ★ Şefin Tavsiyesi
                            </span>
                        )}
                        {product.calories && (
                            <span className="px-3 py-1 bg-zinc-100 text-zinc-600 text-xs font-bold rounded-full border border-zinc-200">
                                🔥 {product.calories} kcal
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
