"use client";

import { useEffect, useState } from "react";
import { SettingsService } from "@/services/settings-service";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Save, Loader2, Globe, Instagram as InstagramIcon, Trash2, AlertTriangle } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [cleaningImages, setCleaningImages] = useState(false);

    const [settings, setSettings] = useState({
        backgroundImage: "",
        title: "",
        subtitle: "",
        instagramUrl: "",
        websiteUrl: "",
        landingLogo: ""
    });

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const data = await SettingsService.getAdminAppSettings();
                if (data) {
                    setSettings(data);
                }
            } catch (error) {
                console.error(error);
                alert(error instanceof Error ? error.message : "Ayarlar yuklenemedi.");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const normalizedSettings = {
                ...settings,
                title: settings.title.trim(),
                subtitle: settings.subtitle.trim(),
                instagramUrl: settings.instagramUrl.trim(),
                websiteUrl: settings.websiteUrl.trim()
            };

            await SettingsService.updateAdminAppSettings(normalizedSettings);
            setSettings(normalizedSettings);
            alert("Ayarlar guncellendi!");
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : "Bir hata olustu.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
    };

    const handleCleanupUnusedImages = async () => {
        if (!window.confirm("Kullanilmayan gorseller storage'dan silinsin mi? Bu islem geri alinamaz.")) {
            return;
        }

        setCleaningImages(true);
        try {
            const response = await fetch("/api/admin/storage/cleanup", { method: "POST" });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Temizleme basarisiz oldu.");
            }

            alert(data?.message || `${data.deletedCount || 0} kullanilmayan gorsel silindi.`);
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Gorseller temizlenirken bir hata olustu.");
        } finally {
            setCleaningImages(false);
        }
    };

    if (loading) return <div>Yukleniyor...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Ayarlar</h1>
                    <p className="text-zinc-500 mt-2">Giris sayfasi ve genel site ayarlari.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Kaydet
                </Button>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Gorsel ve Marka</CardTitle>
                        <CardDescription>Ana sayfada gorunecek resim ve basliklar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700">Arka Plan Resmi</label>
                                <ImageUpload
                                    value={settings.backgroundImage}
                                    onChange={(url) => handleChange("backgroundImage", url)}
                                    onRemove={() => handleChange("backgroundImage", "")}
                                    folder="qr-menu-settings"
                                />
                                <p className="text-xs text-zinc-500 max-w-[200px]">
                                    Yuksek kaliteli bir dikey veya kare fotograf onerilir. (JPG/PNG)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700">Ana Logo</label>
                                <ImageUpload
                                    value={settings.landingLogo}
                                    onChange={(url) => handleChange("landingLogo", url)}
                                    onRemove={() => handleChange("landingLogo", "")}
                                    folder="qr-menu-settings"
                                />
                                <p className="text-xs text-zinc-500 max-w-[200px]">
                                    Oturum sayfasinin ortasinda gorunen marka logosu. (Tercihen PNG/SVG)
                                </p>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700">Ana Baslik (Otel/Restoran Adi)</label>
                                    <Input
                                        value={settings.title}
                                        onChange={(e) => handleChange("title", e.target.value)}
                                        placeholder="CROWNE PLAZA"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700">Alt Baslik (Sehir/Sube)</label>
                                    <Input
                                        value={settings.subtitle}
                                        onChange={(e) => handleChange("subtitle", e.target.value)}
                                        placeholder="ANKARA"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Sosyal Medya ve Linkler</CardTitle>
                        <CardDescription>Musterileri yonlendireceginiz dis baglantilar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                                <InstagramIcon className="h-5 w-5 text-zinc-500" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-xs font-medium text-zinc-500">Instagram URL</label>
                                <Input
                                    value={settings.instagramUrl}
                                    onChange={(e) => handleChange("instagramUrl", e.target.value)}
                                    placeholder="https://instagram.com/..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                                <Globe className="h-5 w-5 text-zinc-500" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-xs font-medium text-zinc-500">Web Sitesi URL</label>
                                <Input
                                    value={settings.websiteUrl}
                                    onChange={(e) => handleChange("websiteUrl", e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription>Kullanilmayan storage gorsellerini topluca temizlemek icin kullanin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm text-zinc-500">
                                Veritabaninda referansi kalmayan urun, kategori, mekan ve ayar gorsellerini siler.
                            </p>
                            <Button
                                variant="outline"
                                onClick={handleCleanupUnusedImages}
                                disabled={cleaningImages}
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                                {cleaningImages ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                Kullanilmayan Resimleri Sil
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
