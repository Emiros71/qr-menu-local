"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Product } from "@/data/db";
import { motion, AnimatePresence } from "framer-motion";

interface ProductModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    localize: (obj: any, field: string) => string;
    localizeAllergen: (name: string) => string;
    currencySymbol?: string;
    defaultImage: string;
}
const getDiscountedPrice = (price: number, type?: 'percentage' | 'fixed' | null, amount?: number | null) => {
    if (!type || !amount) return null;
    if (type === 'percentage') return Math.max(0, price - (price * (amount / 100)));
    if (type === 'fixed') return Math.max(0, price - amount);
    return null;
};

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

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    if (!isOpen || !product) return null;

    // Use portal to render at root level
    return createPortal(
        <AnimatePresence>
            {isOpen && product && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        layoutId={`product-${product.id}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
                        className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-10"
                    >
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
                                className={`object-cover ${!product.image ? 'p-8 opacity-50 object-contain' : ''}`}
                            />
                        </div>

                        {/* Details */}
                        <div className="p-6 overflow-y-auto">
                            <div className="flex justify-between items-start gap-4 mb-2">
                                <h2 className="text-2xl font-bold text-zinc-900 leading-tight">
                                    {localize(product, 'name')}
                                </h2>
                                <span className="text-xl font-bold text-primary whitespace-nowrap flex flex-col items-end">
                                    {product.discount_type && product.discount_amount ? (
                                        <>
                                            <span className="text-sm text-zinc-400 line-through">
                                                {currencySymbol}{product.price}
                                            </span>
                                            <span className="flex items-center gap-2">
                                                {currencySymbol}{getDiscountedPrice(product.price, product.discount_type, product.discount_amount)?.toFixed(2).replace(/\.00$/, '')}
                                                <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full inline-block shadow-sm">
                                                    {product.discount_type === 'percentage' ? `%${product.discount_amount} İndirim` : `-${product.discount_amount}₺`}
                                                </span>
                                            </span>
                                        </>
                                    ) : (
                                        <span>{currencySymbol}{product.price}</span>
                                    )}
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
                                {(product as any).calories && (
                                    <span className="px-3 py-1 bg-zinc-100 text-zinc-600 text-xs font-bold rounded-full border border-zinc-200">
                                        🔥 {(product as any).calories} kcal
                                    </span>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
