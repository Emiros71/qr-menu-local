"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/Button";
import { Download, Upload, Loader2, FileSpreadsheet, Image as ImageIcon, Check } from "lucide-react";
import { compressImage } from "@/utils/image-compression";

interface ProductImporterProps {
    onImport: (products: unknown[]) => Promise<void>;
    onExport?: () => void;
    existingCategories: { id: string; name: string }[];
}

// Helper for batched processing
const chunkArray = (array: unknown[], size: number) => {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
};

export default function ProductImporter({ onImport, onExport, existingCategories }: ProductImporterProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [importing, setImporting] = useState(false);
    const [step, setStep] = useState<'idle' | 'validate' | 'review' | 'uploading'>('idle');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [parsedProducts, setParsedProducts] = useState<any[]>([]);
    const [unknownCategories, setUnknownCategories] = useState<string[]>([]);
    const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({}); // "Unknown Name" -> "Target ID" (or "")

    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    const parseOptionalId = (rawValue: string) => {
        const normalized = rawValue.trim();
        if (!normalized) return "";
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(normalized) ? normalized : "";
    };

    const parsePrice = (rawValue: string) => {
        if (!rawValue) return 0;
        const normalized = rawValue.replace(/\s/g, "").replace(",", ".");
        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const handleDownloadTemplate = () => {
        const headers = [
            {
                "ID": "Yeni ürün için boş bırakınız",
                "Ürün Adı": "Örnek Ürün",
                "Ürün Adı (EN)": "Example Product",
                "Açıklama": "Lezzetli bir yemek",
                "Açıklama (EN)": "A delicious meal",
                "Fiyat": 150,
                "Kategori": "Ana Yemekler",
                "Kategori (EN)": "Main Courses",
                "Alerjenler": "Gluten, Süt",
                "Şef": "Hayır",
                "İndirim Tipi": "percentage",
                "İndirim Değeri": 15,
                "Başlama Saati": "00:00",
                "Bitiş Saati": "23:59",
                "Görsel Dosya Adı": "burger.jpg (Opsiyonel)"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(headers);
        ws['!cols'] = [
            { wch: 30 }, // ID
            { wch: 20 }, // Ad
            { wch: 20 }, // Ad EN
            { wch: 30 }, // Açıklama
            { wch: 30 }, // Açıklama EN
            { wch: 10 }, // Fiyat
            { wch: 20 }, // Kategori
            { wch: 20 }, // Kategori EN
            { wch: 20 }, // Alerjenler
            { wch: 10 }, // Şef
            { wch: 15 }, // İndirim Tipi
            { wch: 15 }, // İndirim Değeri
            { wch: 15 }, // Başlama Saati
            { wch: 15 }, // Bitiş Saati
            { wch: 40 }  // Görsel
        ];
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            const mapped = jsonData.map(row => {
                const getVal = (key: string) => {
                    const trimmedKey = key.trim().toLowerCase();
                    const matchingKey = Object.keys(row).find(k => k.trim().toLowerCase() === trimmedKey);
                    return matchingKey ? String(row[matchingKey]).trim() : "";
                };

                // Try to find image filename 
                const imgFile = getVal("Görsel Dosya Adı") || getVal("Dosya") || getVal("Image") || "";

                // i18n Parsing
                const nameEn = getVal("Ürün Adı (EN)") || getVal("Product Name EN") || getVal("Name EN");
                const descEn = getVal("Açıklama (EN)") || getVal("Description EN");
                const catEn = getVal("Kategori (EN)") || getVal("Category EN");

                const translations: Record<string, unknown> = {};
                if (nameEn || descEn) {
                    translations['en'] = {
                        name: nameEn,
                        description: descEn
                    };
                }

                return {
                    id: parseOptionalId(getVal("ID")), // Optional ID for updates
                    name: getVal("Name") || getVal("Ürün Adı") || "İsimsiz Ürün",
                    description: getVal("Description") || getVal("Açıklama") || "",
                    price: parsePrice(getVal("Price") || getVal("Fiyat") || "0"),
                    categoryName: getVal("Category") || getVal("Kategori") || "Genel",
                    categoryNameEn: catEn,
                    allergens: (getVal("Allergens") || getVal("Alerjenler") || "").split(",").map((s: string) => s.trim()).filter(Boolean),
                    isChefRecommendation: ["evet", "yes", "true", "1"].includes(String(getVal("Chef") || getVal("Şef")).toLowerCase()),
                    imageFilename: imgFile,
                    image: imgFile.startsWith("http") ? imgFile : "", // If already URL, use it
                    translations: translations, // Add translations to product
                    isAvailable: true,
                    discount_type: getVal("İndirim Tipi") || getVal("Discount Type") || null,
                    discount_amount: getVal("İndirim Değeri") || getVal("Discount Amount")
                        ? parsePrice(getVal("İndirim Değeri") || getVal("Discount Amount"))
                        : null,
                    startTime: getVal("Başlama Saati") || getVal("Start Time") || null,
                    endTime: getVal("Bitiş Saati") || getVal("End Time") || null
                };
            });

            if (mapped.length > 0) {
                setParsedProducts(mapped);

                // Validation Step: Check Categories
                const incomingCategories = Array.from(new Set(mapped.map(p => (p.categoryName || "Genel").trim()))).filter(Boolean);
                const unknown = incomingCategories.filter(catName =>
                    !existingCategories.some(ec => ec.name.toLowerCase() === catName.toLowerCase())
                );

                if (unknown.length > 0) {
                    setUnknownCategories(unknown);
                    // Initialize mapping with matching ID or empty (create new)
                    const initialMap: Record<string, string> = {};
                    unknown.forEach(u => initialMap[u] = "NEW");
                    setCategoryMapping(initialMap);
                    setStep('validate');
                } else {
                    setStep('review');
                }
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

    const handleCategoryMapConfirm = () => {
        // Apply mapping to parsedProducts
        const updated = parsedProducts.map(p => {
            const catName = (p.categoryName || "Genel").trim();
            const mappedId = categoryMapping[catName];

            // If user selected an existing category ID, update the name to match system name
            // If "NEW", keep original name (it will be created by parent)
            if (mappedId && mappedId !== "NEW") {
                const targetCat = existingCategories.find(c => c.id === mappedId);
                if (targetCat) {
                    return { ...p, categoryName: targetCat.name }; // Normalize name
                }
            }
            return p;
        });

        setParsedProducts(updated);
        setStep('review');
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
                    const rawFile = fileMap.get(filename.toLowerCase());
                    if (!rawFile) return; // File not found in selection

                    try {
                        // Sıkıştırma: Toplu yüklemelerde çok önemli (Max 1MB)
                        const file = await compressImage(rawFile, { maxSizeMB: 1 });

                        // 1. Prepare Params
                        const timestamp = Math.round((new Date()).getTime() / 1000);
                        const folder = "qr-menu/products";
                        // Use filename as public_id (remove extension) to avoid duplicates (overwrite mode)
                        const public_id = filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_");

                        const paramsToSign = {
                            timestamp,
                            folder,
                            public_id,
                            use_filename: true,
                            unique_filename: false,
                            overwrite: true
                        };

                        // 2. Sign
                        const signRes = await fetch('/api/sign-cloudinary', {
                            method: 'POST',
                            body: JSON.stringify({ paramsToSign })
                        });

                        if (!signRes.ok) throw new Error("Sign failed");
                        const { signature } = await signRes.json();

                        // 3. Upload
                        const formData = new FormData();
                        formData.append("file", file);
                        Object.entries(paramsToSign).forEach(([key, value]) => {
                            formData.append(key, value.toString());
                        });
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
                    await Promise.all((chunk as Array<() => Promise<unknown>>).map(task => task()));
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

            {/* Modal for Review & Image Match & Validation */}
            {(step === 'review' || step === 'uploading' || step === 'validate') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-2 text-zinc-900">
                                {step === 'validate' ? "Kategori Eşleştirme" :
                                    importing ? "Yükleniyor..." : "Verileri Doğrula"}
                            </h3>

                            {step !== 'validate' && (
                                <p className="text-sm text-zinc-500 mb-4">{parsedProducts.length} adet ürün bulundu.</p>
                            )}

                            {step === 'validate' ? (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                                        <h4 className="font-semibold mb-1">Bilinmeyen Kategoriler</h4>
                                        <p>Excel&apos;deki bazı kategoriler sistemde bulunamadı. Eşleştirme yapabilir veya yeni oluşturabilirsiniz.</p>
                                    </div>

                                    <div className="max-h-60 overflow-y-auto space-y-3 p-1">
                                        {unknownCategories.map(cat => (
                                            <div key={cat} className="flex items-center justify-between bg-zinc-50 p-3 border rounded">
                                                <span className="font-medium text-zinc-900 truncate max-w-[150px]" title={cat}>{cat}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-zinc-400">→</span>
                                                    <select
                                                        className="bg-white border border-zinc-200 rounded px-2 py-1 text-sm w-40 focus:ring-2 focus:ring-primary/20 outline-none"
                                                        value={categoryMapping[cat] || "NEW"}
                                                        onChange={(e) => setCategoryMapping(prev => ({ ...prev, [cat]: e.target.value }))}
                                                    >
                                                        <option value="NEW">+ Yeni Oluştur</option>
                                                        <optgroup label="Mevcut Kategoriler">
                                                            {existingCategories.map(ec => (
                                                                <option key={ec.id} value={ec.id}>{ec.name}</option>
                                                            ))}
                                                        </optgroup>
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end pt-4 bg-zinc-50 -mx-6 -mb-6 p-4 border-t border-zinc-100">
                                        <Button variant="ghost" onClick={() => setStep('idle')} className="mr-2">İptal</Button>
                                        <Button onClick={handleCategoryMapConfirm}>Onayla ve Devam Et</Button>
                                    </div>
                                </div>
                            ) : step === 'uploading' ? (
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
                                                        Excel&apos;de <b>{totalWithImageRef}</b> ürün için dosya adı belirtilmiş. Bilgisayarınızdan bu resimleri seçerseniz otomatik eşleşir.
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
