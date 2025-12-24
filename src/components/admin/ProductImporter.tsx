"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/Button";
import { Download, Upload, Loader2, FileSpreadsheet, Image as ImageIcon, Check } from "lucide-react";

interface ProductImporterProps {
    onImport: (products: any[]) => Promise<void>;
    onExport?: () => void;
}

// Helper for batched processing
const chunkArray = (array: any[], size: number) => {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
};

export default function ProductImporter({ onImport, onExport }: ProductImporterProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [importing, setImporting] = useState(false);
    const [step, setStep] = useState<'idle' | 'review' | 'uploading'>('idle');
    const [parsedProducts, setParsedProducts] = useState<any[]>([]);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleDownloadTemplate = () => {
        const headers = [
            {
                "ID": "Yeni ürün için boş bırakınız",
                "Ürün Adı": "Örnek Ürün",
                "Açıklama": "Lezzetli bir yemek",
                "Fiyat": 150,
                "Kategori": "Ana Yemekler",
                "Alerjenler": "Gluten, Süt",
                "Şef": "Hayır",
                "Görsel Dosya Adı": "burger.jpg (Opsiyonel)"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(headers);
        ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 40 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Şablon");
        XLSX.writeFile(wb, "qr_menu_sablon.xlsx");
    };

    const handleExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            const mapped = jsonData.map(row => {
                const getVal = (key: string) => row[key] || row[key.toLowerCase()] || row[key.toUpperCase()] || "";

                // Try to find image filename 
                let imgFile = getVal("Görsel Dosya Adı") || getVal("Dosya") || getVal("Image") || "";

                return {
                    id: getVal("ID"), // Optional ID for updates
                    name: getVal("Name") || getVal("Ürün Adı") || "İsimsiz Ürün",
                    description: getVal("Description") || getVal("Açıklama") || "",
                    price: parseFloat(getVal("Price") || getVal("Fiyat") || "0"),
                    categoryName: getVal("Category") || getVal("Kategori") || "Genel",
                    allergens: (getVal("Allergens") || getVal("Alerjenler") || "").split(",").map((s: string) => s.trim()).filter(Boolean),
                    isChefRecommendation: ["evet", "yes", "true", "1"].includes(String(getVal("Chef") || getVal("Şef")).toLowerCase()),
                    imageFilename: imgFile,
                    image: imgFile.startsWith("http") ? imgFile : "", // If already URL, use it
                    isAvailable: true
                };
            });

            if (mapped.length > 0) {
                setParsedProducts(mapped);
                setStep('review');
            } else {
                alert("Excel dosyasında veri bulunamadı.");
            }
        } catch (err) {
            console.error("Excel parse error:", err);
            alert("Dosya okunamadı.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedImages(Array.from(e.target.files));
        }
    };

    const performUploadAndImport = async () => {
        setImporting(true);
        setStep('uploading');
        setUploadProgress(0);

        try {
            const finalProducts = [...parsedProducts];
            const productsWithImages = finalProducts.filter(p => p.imageFilename && !p.image);

            // 1. Upload Images if any selected
            if (selectedImages.length > 0 && productsWithImages.length > 0) {
                const totalToUpload = productsWithImages.length;
                let uploadedCount = 0;

                // Create a map for fast lookup: filename -> File object
                const fileMap = new Map<string, File>();
                selectedImages.forEach(file => fileMap.set(file.name.toLowerCase(), file));

                // Helper to upload single file
                const uploadFile = async (productIndex: number, filename: string) => {
                    const file = fileMap.get(filename.toLowerCase());
                    if (!file) return; // File not found in selection

                    try {
                        // 1. Sign
                        const timestamp = Math.round((new Date()).getTime() / 1000);
                        const folder = "qr-menu/products";

                        const signRes = await fetch('/api/sign-cloudinary', {
                            method: 'POST',
                            body: JSON.stringify({ paramsToSign: { timestamp, folder } })
                        });

                        if (!signRes.ok) throw new Error("Sign failed");
                        const { signature } = await signRes.json();

                        // 2. Upload
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("timestamp", timestamp.toString());
                        formData.append("folder", folder);
                        formData.append("signature", signature);
                        formData.append("api_key", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || "");

                        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo";
                        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                            method: "POST",
                            body: formData
                        });

                        const data = await res.json();
                        if (data.secure_url) {
                            finalProducts[productIndex].image = data.secure_url;
                        }

                    } catch (err) {
                        console.error(`Failed to upload ${filename}`, err);
                    } finally {
                        uploadedCount++;
                        setUploadProgress(Math.round((uploadedCount / totalToUpload) * 100));
                    }
                };

                // Process in parallel (chunks of 5)
                const tasks = [];
                for (let i = 0; i < finalProducts.length; i++) {
                    const p = finalProducts[i];
                    if (p.imageFilename && !p.image) {
                        tasks.push(() => uploadFile(i, p.imageFilename));
                    }
                }

                const chunks = chunkArray(tasks, 5);
                for (const chunk of chunks) {
                    await Promise.all(chunk.map((task: any) => task()));
                }
            }

            // 2. Save to DB
            await onImport(finalProducts);
            setStep('idle');
            setParsedProducts([]);
            setSelectedImages([]);

        } catch (err) {
            console.error("Import process failed:", err);
            alert("İşlem sırasında bir hata oluştu.");
            setStep('review'); // Go back to review on failure
        } finally {
            setImporting(false);
        }
    };

    // Derived State for UI
    const totalWithImageRef = parsedProducts.filter(p => p.imageFilename && !p.image).length;
    const matchCount = parsedProducts.filter(p => {
        if (!p.imageFilename || p.image) return false;
        return selectedImages.some(f => f.name.toLowerCase() === p.imageFilename.toLowerCase());
    }).length;


    return (
        <>
            <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleExcelFile} accept=".xlsx, .xls" className="hidden" />

                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} title="Excel Yükle">
                    <Upload className="h-4 w-4 text-green-600 mr-2" />
                    <span className="hidden sm:inline">Excel Yükle</span>
                </Button>

                <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} title="Şablon İndir" className="px-2">
                    <FileSpreadsheet className="h-4 w-4 text-zinc-500" />
                </Button>

                {onExport && (
                    <Button variant="ghost" size="sm" onClick={onExport} title="İndir" className="px-2">
                        <Download className="h-4 w-4 text-zinc-500" />
                    </Button>
                )}
            </div>

            {/* Manual Modal Implementation */}
            {(step === 'review' || step === 'uploading') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-2 text-zinc-900">{importing ? "Yükleniyor..." : "Verileri Doğrula"}</h3>
                            <p className="text-sm text-zinc-500 mb-4">{parsedProducts.length} adet ürün bulundu.</p>

                            {step === 'uploading' ? (
                                <div className="py-6 flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                    <div className="text-sm text-zinc-500">
                                        {uploadProgress < 100 ? `Görseller Yükleniyor... %${uploadProgress}` : "Veritabanına Kaydediliyor..."}
                                    </div>
                                    <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {totalWithImageRef > 0 && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                                            <div className="flex items-start gap-3">
                                                <ImageIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                                                <div>
                                                    <h4 className="text-sm font-semibold text-amber-900">Görsel Eşleştirme</h4>
                                                    <p className="text-xs text-amber-700 mt-1">
                                                        Excel'de <b>{totalWithImageRef}</b> ürün için dosya adı belirtilmiş. Bilgisayarınızdan bu resimleri seçerseniz otomatik eşleşir.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="file"
                                                    ref={imageInputRef}
                                                    onChange={handleImageSelection}
                                                    multiple
                                                    accept="image/*"
                                                    className="hidden"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => imageInputRef.current?.click()}
                                                    className="w-full"
                                                >
                                                    Görselleri Seç ({selectedImages.length} seçildi)
                                                </Button>
                                            </div>

                                            {selectedImages.length > 0 && (
                                                <div className="flex items-center gap-2 text-xs font-medium text-green-700">
                                                    <Check className="h-3 w-3" />
                                                    {matchCount} / {totalWithImageRef} görsel eşleşti.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="bg-zinc-50 p-3 rounded text-xs text-zinc-500 max-h-32 overflow-y-auto border border-zinc-100">
                                        {parsedProducts.slice(0, 5).map((p, i) => (
                                            <div key={i} className="flex justify-between border-b last:border-0 border-zinc-200 py-1">
                                                <span className="text-zinc-900">{p.name}</span>
                                                <span className="font-mono text-zinc-600">{p.price}₺</span>
                                            </div>
                                        ))}
                                        {parsedProducts.length > 5 && <div className="py-1 text-center italic text-zinc-400">...ve {parsedProducts.length - 5} diğer</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {!importing && (
                            <div className="bg-zinc-50 p-4 flex justify-end gap-2 border-t border-zinc-100">
                                <Button variant="ghost" onClick={() => setStep('idle')}>İptal</Button>
                                <Button onClick={performUploadAndImport}>
                                    {totalWithImageRef > 0 && matchCount === 0 ? "Resimsiz Yükle" : "Onayla ve Yükle"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
