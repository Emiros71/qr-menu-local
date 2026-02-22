import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Venue } from "@/data/db";
import { Loader2, AlertCircle, X } from "lucide-react";

interface UserModalProps {
    user: any | null;
    venues: Venue[];
    onClose: () => void;
    onSaved: () => void;
}

export function UserModal({ user, venues, onClose, onSaved }: UserModalProps) {
    const isEditing = !!user;

    const [email, setEmail] = useState(user?.email || "");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState(user?.full_name || "");
    const [role, setRole] = useState(user?.role || "STAFF");
    const [venueId, setVenueId] = useState<string>(user?.venue_id || "");

    // Tags state
    const [tags, setTags] = useState<string[]>(user?.tags || []);
    const [tagInput, setTagInput] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddTag = () => {
        if (!tagInput.trim()) return;
        const normalized = tagInput.trim().toUpperCase();
        if (!tags.includes(normalized)) {
            setTags([...tags, normalized]);
        }
        setTagInput("");
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const payload = {
                id: user?.id,
                email,
                password: password || undefined,
                full_name: fullName,
                role,
                venue_id: venueId || null,
                tags
            };

            const url = '/api/admin/users';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Beklenmeyen bir hata oluştu");
            }

            onSaved();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Ekle"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Kullanıcı bilgilerini, yetkilerini ve şifresini güncelleyin."
                            : "Sisteme erişebilecek yeni bir yönetici veya personel oluşturun."}
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-md text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                            <label className="text-sm font-medium text-zinc-700">Ad Soyad</label>
                            <Input
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Ahmet Yılmaz"
                            />
                        </div>
                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                            <label className="text-sm font-medium text-zinc-700">E-posta</label>
                            <Input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@ornek.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-zinc-700">
                            {isEditing ? "Yeni Şifre Belirle (Boş bırakırsanız değişmez)" : "Şifre (En az 6 karakter)"}
                        </label>
                        <Input
                            type="password"
                            required={!isEditing}
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-zinc-700">Sistem Yetkisi (Rol)</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <option value="STAFF">Personel (Sadece Görüntüler)</option>
                                <option value="VENUE_MANAGER">Mekan Yöneticisi</option>
                                <option value="SUPER_ADMIN">Süper Admin (Tam Yetki)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-zinc-700">Bağlı Olduğu Mekan</label>
                            <select
                                className="flex h-10 w-full border-zinc-200 rounded-md border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-zinc-100"
                                value={venueId}
                                onChange={(e) => setVenueId(e.target.value)}
                                disabled={role === 'SUPER_ADMIN'}
                            >
                                <option value="">Global (Tümü)</option>
                                {venues.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                            {role === 'SUPER_ADMIN' && <p className="text-[10px] text-zinc-500">Süper Admin tüm mekanları görür.</p>}
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                        <label className="text-sm font-medium text-zinc-700">Özel Etiketler (Tags)</label>
                        <p className="text-xs text-zinc-500">Müşterinin özel erişimlerini (örn: MODULE_EXCEL, PRO_MEMBER) belirlemek için kullanılır.</p>

                        <div className="flex gap-2">
                            <Input
                                placeholder="Örn: PREM_SUPPORT"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                            />
                            <Button type="button" variant="secondary" onClick={handleAddTag}>Ekle</Button>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                            {tags.map(tag => (
                                <span key={tag} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-md border border-blue-200">
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTag(tag)}
                                        className="text-blue-400 hover:text-blue-800 focus:outline-none"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                            {tags.length === 0 && <span className="text-sm text-zinc-400 italic">Etiket eklenmedi.</span>}
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t border-zinc-100 mt-6">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Vazgeç
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? "Değişiklikleri Kaydet" : "Kullanıcı Oluştur"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
