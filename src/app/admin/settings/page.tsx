"use client";

import { useEffect, useState } from "react";
import { SettingsService } from "@/services/settings-service";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Save, Loader2, Globe, Instagram as InstagramIcon, Image as ImageIcon } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [settings, setSettings] = useState({
        backgroundImage: "",
        title: "",
        subtitle: "",
        instagramUrl: "",
        websiteUrl: ""
    });

    useEffect(() => {
        async function load() {
            setLoading(true);
            const data = await SettingsService.getAppSettings();
            if (data) {
                setSettings(data);
            }
            setLoading(false);
        }
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await SettingsService.updateAppSettings('landing_page', settings);
            alert("Ayarlar güncellendi!");
        } catch (err) {
            console.error(err);
            alert("Bir hata oluştu.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    if (loading) return <div>Yükleniyor...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Ayarlar</h1>
                    <p className="text-zinc-500 mt-2">Giriş sayfası ve genel site ayarları.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Kaydet
                </Button>
            </div>

            <div className="grid gap-6">

                {/* Visual Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Görsel & Marka</CardTitle>
                        <CardDescription>Ana sayfada görünecek resim ve başlıklar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700">Arka Plan Resmi</label>
                                <ImageUpload
                                    value={settings.backgroundImage}
                                    onChange={(url) => handleChange('backgroundImage', url)}
                                    onRemove={() => handleChange('backgroundImage', '')}
                                    folder="qr-menu-settings"
                                />
                                <p className="text-xs text-zinc-500 max-w-[200px]">
                                    Yüksek kaliteli bir dikey veya kare fotoğraf önerilir. (JPG/PNG)
                                </p>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700">Ana Başlık (Otel/Restoran Adı)</label>
                                    <Input
                                        value={settings.title}
                                        onChange={(e) => handleChange('title', e.target.value)}
                                        placeholder="CROWNE PLAZA"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700">Alt Başlık (Şehir/Şube)</label>
                                    <Input
                                        value={settings.subtitle}
                                        onChange={(e) => handleChange('subtitle', e.target.value)}
                                        placeholder="ANKARA"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Social Links */}
                <Card>
                    <CardHeader>
                        <CardTitle>Sosyal Medya & Linkler</CardTitle>
                        <CardDescription>Müşterileri yönlendireceğiniz dış bağlantılar.</CardDescription>
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
                                    onChange={(e) => handleChange('instagramUrl', e.target.value)}
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
                                    onChange={(e) => handleChange('websiteUrl', e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
