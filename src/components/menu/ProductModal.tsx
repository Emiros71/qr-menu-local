"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Product, getBaseProductPrice, getCurrencySymbol } from "@/data/db";

interface ProductModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    localize: (obj: unknown, field: string) => string;
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
        document.body.style.overflow = isOpen ? 'hidden' : 'unset';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!mounted || !isOpen || !product) return null;

    const resolvedCurrencySymbol = getCurrencySymbol(product.currency) || currencySymbol;
    const hasVariants = product.pricingMode === 'variants' && Array.isArray(product.priceVariants) && product.priceVariants.length > 0;
    const basePrice = getBaseProductPrice(product);

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    layoutId={`product-${product.id}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
                    className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                >
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white backdrop-blur-md transition-colors hover:bg-black/70"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="relative h-64 w-full shrink-0 bg-zinc-100 md:h-80">
                        <Image
                            src={product.image || defaultImage}
                            alt={localize(product, 'name')}
                            fill
                            className={`object-cover ${!product.image ? 'object-contain p-8 opacity-50' : ''}`}
                        />
                    </div>

                    <div className="overflow-y-auto p-6">
                        <div className="mb-2 flex items-start justify-between gap-4">
                            <h2 className="text-2xl font-bold leading-tight text-zinc-900">
                                {localize(product, 'name')}
                            </h2>
                            <span className="flex flex-col items-end whitespace-nowrap text-xl font-bold text-primary">
                                {!hasVariants && product.discount_type && product.discount_amount ? (
                                    <>
                                        <span className="text-sm text-zinc-400 line-through">
                                            {resolvedCurrencySymbol}{product.price}
                                        </span>
                                        <span className="flex items-center gap-2">
                                            {resolvedCurrencySymbol}{getDiscountedPrice(product.price, product.discount_type, product.discount_amount)?.toFixed(2).replace(/\.00$/, '')}
                                            <span className="inline-block rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white shadow-sm">
                                                {product.discount_type === 'percentage'
                                                    ? `%${product.discount_amount} İndirim`
                                                    : `-${product.discount_amount}${resolvedCurrencySymbol}`}
                                            </span>
                                        </span>
                                    </>
                                ) : hasVariants ? (
                                    <span>Başlangıç {resolvedCurrencySymbol}{basePrice}</span>
                                ) : (
                                    <span>{resolvedCurrencySymbol}{product.price}</span>
                                )}
                            </span>
                        </div>

                        <p className="mb-6 leading-relaxed text-zinc-600">
                            {localize(product, 'description')}
                        </p>

                        {hasVariants && (
                            <div className="mb-6">
                                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-900 opacity-70">
                                    Boyut Seçenekleri
                                </h4>
                                <div className="space-y-2">
                                    {product.priceVariants!.map(variant => {
                                        const discountedVariantPrice = getDiscountedPrice(variant.price, product.discount_type, product.discount_amount);
                                        return (
                                            <div key={variant.label} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                                                <span className="font-medium text-zinc-800">{variant.label}</span>
                                                <div className="text-right">
                                                    {discountedVariantPrice !== null ? (
                                                        <>
                                                            <div className="text-xs text-zinc-400 line-through">
                                                                {resolvedCurrencySymbol}{variant.price}
                                                            </div>
                                                            <div className="font-semibold text-primary">
                                                                {resolvedCurrencySymbol}{discountedVariantPrice.toFixed(2).replace(/\.00$/, '')}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="font-semibold text-primary">
                                                            {resolvedCurrencySymbol}{variant.price}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {product.allergens && product.allergens.length > 0 && (
                            <div className="mb-6">
                                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-900 opacity-70">
                                    Alerjenler & İçerik
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {product.allergens.map(allergen => (
                                        <span
                                            key={allergen}
                                            className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm"
                                        >
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500/50" />
                                            {localizeAllergen(allergen)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            {product.isChefRecommendation && (
                                <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                                    ★ Şefin Tavsiyesi
                                </span>
                            )}
                            {(product as Product & { calories?: number }).calories && (
                                <span className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
                                    {(product as Product & { calories?: number }).calories} kcal
                                </span>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
