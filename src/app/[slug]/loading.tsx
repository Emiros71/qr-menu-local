"use client";

import { motion } from "framer-motion";

export default function Loading() {
    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col pt-12">
            {/* Header Skeleton */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full h-80 bg-zinc-200 animate-pulse relative"
            >
                <div className="absolute inset-x-0 bottom-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-zinc-300 rounded-full mb-4"></div>
                    <div className="w-48 h-8 bg-zinc-300 rounded-md mb-2"></div>
                    <div className="w-64 h-4 bg-zinc-300 rounded-md"></div>
                </div>
            </motion.div>

            {/* Sticky Nav Skeleton */}
            <div className="sticky top-0 bg-white shadow-sm border-b border-zinc-100 z-40 p-4">
                <div className="container mx-auto">
                    <div className="w-full h-11 bg-zinc-200 rounded-xl mb-4 animate-pulse"></div>
                    <div className="flex gap-4 overflow-hidden">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <div className="w-20 h-20 bg-zinc-200 rounded-2xl animate-pulse"></div>
                                <div className="w-16 h-4 bg-zinc-200 rounded-full animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Menu Items Skeleton */}
            <div className="container mx-auto px-4 max-w-5xl mt-12 flex-1">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-8 w-1.5 rounded-full bg-zinc-300 animate-pulse" />
                            <div className="w-32 h-6 bg-zinc-300 rounded-md animate-pulse"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[...Array(4)].map((_, j) => (
                                <motion.div
                                    key={j}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: (j * 0.1) }}
                                    className="flex p-3 rounded-2xl bg-white border border-zinc-100 shadow-sm gap-4"
                                >
                                    <div className="w-28 h-28 bg-zinc-200 rounded-xl animate-pulse shrink-0"></div>
                                    <div className="flex-1 space-y-3 py-2">
                                        <div className="w-3/4 h-5 bg-zinc-200 rounded-md animate-pulse"></div>
                                        <div className="w-full h-3 bg-zinc-200 rounded-md animate-pulse"></div>
                                        <div className="w-2/3 h-3 bg-zinc-200 rounded-md animate-pulse"></div>
                                        <div className="w-16 h-6 bg-zinc-300 rounded-md animate-pulse mt-4"></div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
