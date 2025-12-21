"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    onRemove: () => void;
    folder?: string;
}

export default function ImageUpload({
    value,
    onChange,
    onRemove,
    folder = "qr-menu"
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);

    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        try {
            // Updated to use Signed Upload (More Secure)

            // 1. Get Signature from our Server
            const timestamp = Math.round((new Date()).getTime() / 1000);

            // Params we want to sign
            const paramsToSign = {
                timestamp,
                folder,
                // We use process.env value passed from props or default
                upload_preset: undefined // Signed uploads usually don't need preset if we sign params manually, OR we use a signed preset. Let's stick to manual signing without preset for maximum control, OR utilize a signed preset if configured.
                // Actually, simplest signed flow:
                // timestamp + folder -> sign it.
            };

            const signRes = await fetch('/api/sign-cloudinary', {
                method: 'POST',
                body: JSON.stringify({
                    paramsToSign: {
                        timestamp,
                        folder
                    }
                })
            });

            if (!signRes.ok) throw new Error("Signature failed");
            const { signature } = await signRes.json();

            // 2. Upload to Cloudinary with Signature
            const formData = new FormData();
            formData.append("file", file);
            formData.append("timestamp", timestamp.toString());
            formData.append("folder", folder);
            formData.append("signature", signature);
            formData.append("api_key", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || "");

            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo";

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            const data = await response.json();

            if (data.secure_url) {
                onChange(data.secure_url);
            } else {
                console.error("Upload failed", data);
                alert("Resim yüklenemedi: " + (data.error?.message || "Bilinmeyen hata"));
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Yükleme sırasında hata oluştu. API Key/Secret kontrol edin.");
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
                    <span className="text-xs text-zinc-500 font-medium">Resim Yükle</span>
                </>
            )}
        </div>
    );
}
