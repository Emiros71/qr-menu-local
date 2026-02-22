"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, Search, Shield, User, Loader2, MoreVertical, Building2, Tag, Trash2 } from "lucide-react";
import { VenueService } from "@/services/venue-service";
import { Venue } from "@/data/db";
import { UserModal } from "./components/UserModal";

interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    venue_id: string | null;
    tags: string[];
    created_at: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load venues for lookup
            const vData = await VenueService.getVenues();
            setVenues(vData);

            // Fetch users from our Admin API
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.data || []);
            }
        } catch (e) {
            console.error("Failed to load users:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getRoleBadge = (role: string) => {
        if (role === 'SUPER_ADMIN') return <span className="bg-purple-100 text-purple-700 font-medium px-2 py-1 rounded text-xs border border-purple-200">Süper Admin</span>;
        if (role === 'VENUE_MANAGER') return <span className="bg-blue-100 text-blue-700 font-medium px-2 py-1 rounded text-xs border border-blue-200">Mekan Yöneticisi</span>;
        return <span className="bg-zinc-100 text-zinc-700 font-medium px-2 py-1 rounded text-xs border border-zinc-200">Personel</span>;
    };

    const getVenueName = (id: string | null) => {
        if (!id) return "Tümü (Global)";
        const v = venues.find(v => v.id === id);
        return v ? v.name : "Bilinmiyor";
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Kullanıcıyı silmek istediğinize emin misiniz?")) return;
        try {
            const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(users.filter(u => u.id !== id));
            } else {
                alert("Silme başarısız.");
            }
        } catch (e) {
            console.error(e);
            alert("Hata oluştu.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" />
                        Kullanıcı ve Rol Yönetimi
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">Sisteme erişebilecek yöneticileri, yetkilerini ve şifrelerini yönetin.</p>
                </div>
                <Button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="shrink-0 gap-2">
                    <Plus className="h-4 w-4" /> Yeni Kullanıcı
                </Button>
            </div>

            <Card className="border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                            placeholder="İsim veya E-posta ara..."
                            className="pl-9 bg-white w-full border-zinc-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="text-xs text-zinc-500 border border-zinc-200 bg-white px-3 py-1.5 rounded-md font-medium">
                        Toplam {users.length} Kullanıcı
                    </div>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-50/80 text-zinc-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-5 py-4 border-b border-zinc-100">Kullanıcı</th>
                                <th className="px-5 py-4 border-b border-zinc-100">Yetki Rolü</th>
                                <th className="px-5 py-4 border-b border-zinc-100">Yetkili Mekan</th>
                                <th className="px-5 py-4 border-b border-zinc-100">Etiketler (Tags)</th>
                                <th className="px-5 py-4 border-b border-zinc-100 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-zinc-300" />
                                        Yükleniyor...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-zinc-500 bg-zinc-50/30">
                                        Hiç kullanıcı bulunamadı.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-zinc-50/80 transition-colors group">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-zinc-100 text-zinc-500 rounded-full flex items-center justify-center shrink-0 border border-zinc-200 overflow-hidden">
                                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.email)}&background=random`} alt="" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-zinc-900 group-hover:text-primary transition-colors">{user.full_name || 'İsimsiz'}</div>
                                                    <div className="text-xs text-zinc-500 break-all">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            {getRoleBadge(user.role)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-1.5 text-zinc-600">
                                                <Building2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                <span className="truncate max-w-[150px] inline-block">{getVenueName(user.venue_id)}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-wrap gap-1">
                                                {!user.tags || user.tags.length === 0 ? (
                                                    <span className="text-xs text-zinc-400 italic">Yok</span>
                                                ) : (
                                                    user.tags.map(tag => (
                                                        <span key={tag} className="flex items-center gap-1 text-[10px] bg-zinc-100 border border-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded uppercase font-medium">
                                                            <Tag className="h-2.5 w-2.5" />
                                                            {tag}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs font-medium mr-2"
                                                onClick={() => { setEditingUser(user); setIsModalOpen(true); }}
                                            >
                                                Düzenle
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                onClick={() => handleDelete(user.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && (
                <UserModal
                    user={editingUser}
                    venues={venues}
                    onClose={() => setIsModalOpen(false)}
                    onSaved={loadData}
                />
            )}
        </div>
    );
}
