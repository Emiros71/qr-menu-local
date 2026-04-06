"use client";

import { useRef, useState } from "react";
import JSZip, { type JSZipObject } from "jszip";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, Image as ImageIcon, Loader2, Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { compressImage } from "@/utils/image-compression";

interface ProductImporterProps {
    onImport: (products: unknown[]) => Promise<void>;
    onExport?: () => void;
    existingCategories: { id: string; name: string }[];
}

const chunkArray = (array: unknown[], size: number) => {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
};

const parsePrice = (rawValue: string) => {
    if (!rawValue) return 0;
    const normalized = rawValue.replace(/\s/g, "").replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};

const parseFlexiblePrice = (rawValue: string) => {
    const trimmed = String(rawValue || "").trim();
    if (!trimmed) return { price: 0, priceText: "" };

    const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
    if (/^\d+(\.\d+)?$/.test(normalized)) {
        return { price: parsePrice(trimmed), priceText: "" };
    }

    const numericParts = trimmed.match(/[\d.,]+/g) || [];
    return {
        price: numericParts.length > 0 ? parsePrice(numericParts[0]!) : 0,
        priceText: trimmed
    };
};

const parseOptionalId = (rawValue: string) => {
    const normalized = rawValue.trim();
    if (!normalized) return "";
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
    const match = normalized.match(uuidRegex);
    return match ? match[0] : "";
};

const parseVariantString = (rawValue: string) => {
    if (!rawValue) return [];
    return rawValue
        .split("|")
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => {
            const [label, price] = part.split(":").map(piece => piece.trim());
            return {
                label: label || "",
                price: parsePrice(price || "0")
            };
        })
        .filter(variant => variant.label && Number.isFinite(variant.price));
};

export default function ProductImporter({ onImport, onExport, existingCategories }: ProductImporterProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const zipInputRef = useRef<HTMLInputElement>(null);

    const [importing, setImporting] = useState(false);
    const [step, setStep] = useState<'idle' | 'validate' | 'review' | 'uploading'>('idle');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [parsedProducts, setParsedProducts] = useState<any[]>([]);
    const [unknownCategories, setUnknownCategories] = useState<string[]>([]);
    const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({});
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleDownloadTemplate = () => {
        const headers = [
            {
                "ID": "Yeni ürün için boş bırakınız",
                "Ürün Adı": "Örnek Ürün",
                "Ürün Adı (EN)": "Example Product",
                "Açıklama": "Lezzetli bir yemek",
                "Açıklama (EN)": "A delicious meal",
                "Fiyatlandırma Tipi": "single",
                "Fiyat": 150,
                "Sıra": 0,
                "Para Birimi": "TRY",
                "Varyantlar": "Small:130|Medium:150|Large:175",
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
            { wch: 30 },
            { wch: 24 },
            { wch: 24 },
            { wch: 32 },
            { wch: 32 },
            { wch: 18 },
            { wch: 10 },
            { wch: 12 },
            { wch: 32 },
            { wch: 20 },
            { wch: 20 },
            { wch: 20 },
            { wch: 10 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 40 }
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

            const mapped = jsonData.map((row, rowIndex) => {
                const getVal = (key: string) => {
                    const trimmedKey = key.trim().toLowerCase();
                    const matchingKey = Object.keys(row).find(k => k.trim().toLowerCase() === trimmedKey);
                    return matchingKey ? String(row[matchingKey]).trim() : "";
                };

                const imgFile = getVal("Görsel Dosya Adı") || getVal("Dosya") || getVal("Image") || "";
                const nameEn = getVal("Ürün Adı (EN)") || getVal("Product Name EN") || getVal("Name EN");
                const descEn = getVal("Açıklama (EN)") || getVal("Description EN");
                const catEn = getVal("Kategori (EN)") || getVal("Category EN");
                const pricingModeRaw = (getVal("Fiyatlandırma Tipi") || getVal("Pricing Mode") || "single").toLowerCase();
                const pricingMode = pricingModeRaw === "variants" || pricingModeRaw === "varyant" || pricingModeRaw === "varyantlar"
                    ? "variants"
                    : "single";
                const currency = (getVal("Para Birimi") || getVal("Currency") || "TRY").toUpperCase();
                const priceVariants = parseVariantString(getVal("Varyantlar") || getVal("Variants"));
                const parsedPrice = parseFlexiblePrice(getVal("Price") || getVal("Fiyat") || "0");
                const orderIndexValue = Number.parseInt(getVal("Sıra") || getVal("Sira") || getVal("Order") || `${rowIndex}`, 10);

                const translations: Record<string, unknown> = {};
                if (nameEn || descEn) {
                    translations.en = {
                        name: nameEn,
                        description: descEn
                    };
                }

                const rawId = getVal("ID");
                return {
                    id: parseOptionalId(rawId),
                    hasIdCell: rawId !== "",
                    name: getVal("Name") || getVal("Ürün Adı") || "İsimsiz Ürün",
                    description: getVal("Description") || getVal("Açıklama") || "",
                    price: parsedPrice.price,
                    priceText: parsedPrice.priceText,
                    currency: ['TRY', 'USD', 'EUR'].includes(currency) ? currency : 'TRY',
                    pricingMode,
                    priceVariants,
                    orderIndex: Number.isFinite(orderIndexValue) ? orderIndexValue : rowIndex,
                    categoryName: getVal("Category") || getVal("Kategori") || "Genel",
                    categoryNameEn: catEn,
                    allergens: (getVal("Allergens") || getVal("Alerjenler") || "").split(",").map((s: string) => s.trim()).filter(Boolean),
                    isChefRecommendation: ["evet", "yes", "true", "1"].includes(String(getVal("Chef") || getVal("Şef")).toLowerCase()),
                    imageFilename: imgFile,
                    image: imgFile.startsWith("http") ? imgFile : "",
                    translations,
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

                const incomingCategories = Array.from(new Set(mapped.map(p => (p.categoryName || "Genel").trim()))).filter(Boolean);
                const unknown = incomingCategories.filter(catName =>
                    !existingCategories.some(ec => ec.name.toLowerCase() === catName.toLowerCase())
                );

                if (unknown.length > 0) {
                    setUnknownCategories(unknown);
                    const initialMap: Record<string, string> = {};
                    unknown.forEach(u => { initialMap[u] = "NEW"; });
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
        const updated = parsedProducts.map(p => {
            const catName = (p.categoryName || "Genel").trim();
            const mappedId = categoryMapping[catName];
            if (mappedId && mappedId !== "NEW") {
                const targetCat = existingCategories.find(c => c.id === mappedId);
                if (targetCat) {
                    return { ...p, categoryName: targetCat.name };
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

    const handleZipSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const zip = await JSZip.loadAsync(file);
            const extractedFiles: File[] = [];

            for (const entry of Object.values(zip.files) as JSZipObject[]) {
                if (entry.dir) continue;

                const entryName = entry.name.split("/").pop() || entry.name;
                if (!entryName) continue;
                if (!/\.(png|jpe?g|webp|gif|avif|bmp|svg)$/i.test(entryName)) continue;

                const blob = await entry.async("blob");
                extractedFiles.push(new File([blob], entryName, {
                    type: blob.type || "application/octet-stream",
                    lastModified: Date.now()
                }));
            }

            setSelectedImages(prev => {
                const next = new Map<string, File>();
                [...prev, ...extractedFiles].forEach(imageFile => {
                    next.set(imageFile.name.toLowerCase(), imageFile);
                });
                return Array.from(next.values());
            });
        } catch (err) {
            console.error("ZIP parse error:", err);
            alert("ZIP dosyasi okunamadi.");
        } finally {
            if (zipInputRef.current) zipInputRef.current.value = "";
        }
    };

    const performUploadAndImport = async () => {
        setImporting(true);
        setStep('uploading');
        setUploadProgress(0);

        try {
            const finalProducts = [...parsedProducts];
            const productsWithImages = finalProducts.filter(p => p.imageFilename && !p.image);

            if (selectedImages.length > 0 && productsWithImages.length > 0) {
                const totalToUpload = productsWithImages.length;
                let uploadedCount = 0;
                const fileMap = new Map<string, File>();
                selectedImages.forEach(file => fileMap.set(file.name.toLowerCase(), file));

                const uploadFile = async (productIndex: number, filename: string) => {
                    const rawFile = fileMap.get(filename.toLowerCase());
                    if (!rawFile) {
                        throw new Error(`Gorsel dosyasi secilmedi: ${filename}`);
                    }

                    try {
                        const file = await compressImage(rawFile, { maxSizeMB: 1 });
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("folder", "qr-menu/products");

                        const res = await fetch("/api/upload-supabase", {
                            method: "POST",
                            body: formData
                        });

                        const data = await res.json();
                        if (!res.ok) throw new Error(data?.error || "Upload failed");
                        if (!data?.secure_url) throw new Error("Upload URL not returned");
                        finalProducts[productIndex].image = data.secure_url;
                    } catch (err) {
                        console.error(`Failed to upload ${filename}`, err);
                        throw err;
                    } finally {
                        uploadedCount++;
                        setUploadProgress(Math.round((uploadedCount / totalToUpload) * 100));
                    }
                };

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

            await onImport(finalProducts);
            setStep('idle');
            setParsedProducts([]);
            setSelectedImages([]);
        } catch (err) {
            console.error("Import process failed:", err);
            alert("İşlem sırasında bir hata oluştu.");
            setStep('review');
        } finally {
            setImporting(false);
        }
    };

    const totalWithImageRef = parsedProducts.filter(p => p.imageFilename && !p.image).length;
    const matchCount = parsedProducts.filter(p => {
        if (!p.imageFilename || p.image) return false;
        return selectedImages.some(f => f.name.toLowerCase() === p.imageFilename.toLowerCase());
    }).length;
    const imageRequirements = parsedProducts
        .filter(p => p.imageFilename && !p.image)
        .map(p => ({
            productName: String(p.name || "Isimsiz Urun"),
            filename: String(p.imageFilename),
            matched: selectedImages.some(f => f.name.toLowerCase() === String(p.imageFilename).toLowerCase())
        }));

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

            {(step === 'review' || step === 'uploading' || step === 'validate') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-2 text-zinc-900">
                                {step === 'validate' ? "Kategori Eşleştirme" : importing ? "Yükleniyor..." : "Verileri Doğrula"}
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
                                                <input
                                                    type="file"
                                                    ref={zipInputRef}
                                                    onChange={handleZipSelection}
                                                    accept=".zip,application/zip"
                                                    className="hidden"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => imageInputRef.current?.click()}
                                                    className="flex-1"
                                                >
                                                    Görselleri Seç ({selectedImages.length} seçildi)
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => zipInputRef.current?.click()}
                                                    className="flex-1"
                                                >
                                                    .zip SeÃ§
                                                </Button>
                                            </div>

                                            {selectedImages.length > 0 && (
                                                <div className="flex items-center gap-2 text-xs font-medium text-green-700">
                                                    <Check className="h-3 w-3" />
                                                    {matchCount} / {totalWithImageRef} görsel eşleşti.
                                                </div>
                                            )}

                                            <div className="bg-white/80 border border-amber-200 rounded-md max-h-32 overflow-y-auto">
                                                {imageRequirements.map((item, index) => (
                                                    <div
                                                        key={`${item.filename}-${index}`}
                                                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs border-b last:border-b-0 border-amber-100"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-zinc-900 truncate" title={item.productName}>
                                                                {item.productName}
                                                            </div>
                                                            <div className="text-amber-800 truncate" title={item.filename}>
                                                                {item.filename}
                                                            </div>
                                                        </div>
                                                        <span className={item.matched ? "text-green-700 font-medium" : "text-zinc-500"}>
                                                            {item.matched ? "Secildi" : "Bekleniyor"}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-zinc-50 p-3 rounded text-xs text-zinc-500 max-h-32 overflow-y-auto border border-zinc-100">
                                        {parsedProducts.slice(0, 5).map((p, i) => (
                                            <div key={i} className="flex justify-between border-b last:border-0 border-zinc-200 py-1">
                                                <span className="text-zinc-900">{p.name}</span>
                                                <span className="font-mono text-zinc-600">
                                                    {p.pricingMode === 'variants' && Array.isArray(p.priceVariants) && p.priceVariants.length > 0
                                                        ? `${p.priceVariants.length} varyant`
                                                        : `${p.price} ${p.currency || 'TRY'}`}
                                                </span>
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
