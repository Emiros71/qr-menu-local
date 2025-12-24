"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/Button";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { Product } from "@/data/db";

interface ImportedProduct {
    name: string;
    description?: string;
    price: number;
    category: string; // Category Name instead of ID
    isAvailable?: boolean;
    isChefRecommendation?: boolean;
    allergens?: string; // Comma separated
}

interface ProductImporterProps {
    onImport: (products: any[]) => Promise<void>;
}

export default function ProductImporter({ onImport }: ProductImporterProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            // Map Excel columns to our schema
            // Expected columns: Name, Price, Description, Category, Allergens
            const mappedProducts = jsonData.map(row => {
                // Normalize keys (case insensitive check)
                const getVal = (key: string) => row[key] || row[key.toLowerCase()] || row[key.toUpperCase()] || "";

                return {
                    name: getVal("Name") || getVal("Ürün Adı") || "İsimsiz Ürün",
                    description: getVal("Description") || getVal("Açıklama") || "",
                    price: parseFloat(getVal("Price") || getVal("Fiyat") || "0"),
                    categoryName: getVal("Category") || getVal("Kategori") || "Genel",
                    allergens: (getVal("Allergens") || getVal("Alerjenler") || "").split(",").map((s: string) => s.trim()).filter(Boolean),
                    isChefRecommendation: !!(getVal("Chef") || getVal("Şef") || false),
                    isAvailable: true
                };
            });

            if (mappedProducts.length > 0) {
                if (window.confirm(`${mappedProducts.length} adet ürün bulundu. Yüklemek istiyor musunuz?`)) {
                    await onImport(mappedProducts);
                }
            } else {
                alert("Excel dosyasında uygun veri bulunamadı.");
            }

        } catch (err) {
            console.error("Excel import error:", err);
            alert("Dosya okunamadı. Lütfen geçerli bir Excel dosyası yükleyin.");
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden"
            />
            <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="gap-2"
            >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
                Excel'den Yükle
            </Button>
        </div>
    );
}
