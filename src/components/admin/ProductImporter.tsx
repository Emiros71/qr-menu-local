"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/Button";
import { Download, Upload, Loader2, FileSpreadsheet } from "lucide-react";
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
    onExport?: () => void; // New optional prop for export
}

export default function ProductImporter({ onImport, onExport }: ProductImporterProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

    const handleDownloadTemplate = () => {
        const headers = [
            { "Ürün Adı": "Örnek Ürün", "Açıklama": "Lezzetli bir yemek", "Fiyat": 150, "Kategori": "Ana Yemekler", "Alerjenler": "Gluten, Süt", "Şef": false }
        ];
        const ws = XLSX.utils.json_to_sheet(headers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Şablon");
        XLSX.writeFile(wb, "qr_menu_sablon.xlsx");
    };

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
        <div className="flex items-center gap-2">
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
                title="Excel Yükle"
            >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-green-600" />}
                <span className="hidden sm:inline ml-2">Yükle</span>
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadTemplate}
                title="Şablon İndir"
                className="text-zinc-500 hover:text-zinc-900 px-2"
            >
                <FileSpreadsheet className="h-4 w-4" />
            </Button>

            {onExport && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onExport}
                    title="Mevcut Listeyi İndir"
                    className="text-zinc-500 hover:text-zinc-900 px-2"
                >
                    <Download className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
