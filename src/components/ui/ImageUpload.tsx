"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import Image from "next/image";
import { compressImage } from "@/utils/image-compression";

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    onRemove: () => void;
    folder?: string;
    venueId?: string;
}

export default function ImageUpload({
    value,
    onChange,
    onRemove,
    folder = "qr-menu/products",
    venueId
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);

    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawFile = e.target.files?.[0];
        if (!rawFile) return;

        setIsUploading(true);

        try {
            const file = await compressImage(rawFile, { maxSizeMB: 1.5 });
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", folder);
            if (venueId) {
                formData.append("venueId", venueId);
            }

            const response = await fetch("/api/upload-supabase", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.secure_url) {
                onChange(data.secure_url);
            } else {
                console.error("Supabase upload failed", data);
                alert("Resim yuklenemedi: " + (data.error || "Bilinmeyen hata"));
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Yukleme sirasinda hata olustu.");
        } finally {
            setIsUploading(false);
        }
    };

    if (value) {
        return (
            <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-zinc-200 group">
                <Image fill src={value} alt="Upload" className="object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={onRemove}
                        type="button"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-40 h-40 rounded-xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-zinc-50 transition-colors cursor-pointer relative overflow-hidden">
            <input
                type="file"
                accept="image/*"
                onChange={onUpload}
                disabled={isUploading}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            {isUploading ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
                <>
                    <ImageIcon className="h-8 w-8 text-zinc-400" />
                    <span className="text-xs text-zinc-500 font-medium">Resim Yukle</span>
                </>
            )}
        </div>
    );
}
