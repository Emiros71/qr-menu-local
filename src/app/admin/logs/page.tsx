"use client";

import { useEffect, useState } from 'react';
import { AuditService } from '@/services/audit-service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Loader2, ShieldCheck, Clock, AlertTriangle, Filter, ChevronDown, ChevronRight, Activity, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// Dummy list of action types for filter
const ACTION_TYPES = [
    { label: 'Tümü', value: 'ALL' },
    { label: 'Giriş Başarılı', value: 'LOGIN' },
    { label: 'Giriş Başarısız', value: 'LOGIN_FAILED' },
    { label: 'Çıkış', value: 'LOGOUT' },
    { label: 'Ürün Ekleme', value: 'CREATE_PRODUCT' },
    { label: 'Alerjen İşlemi', value: 'CREATE_ALLERGEN' },
];

export default function LogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('ALL');
    const [filterResource, setFilterResource] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchUser, setSearchUser] = useState('');
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await AuditService.getLogs(50, {
                type: filterType === 'ALL' ? undefined : filterType,
                resource: filterResource === 'ALL' ? undefined : filterResource,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                searchUser: searchUser || undefined
            });
            setLogs(data);
        } catch (err) {
            console.error("Failed to load logs", err);
        } finally {
            setLoading(false);
        }
    };

    // Load on mount and filter changes
    useEffect(() => {
        const timer = setTimeout(() => {
            loadLogs();
        }, 500); // Debounce for text search
        return () => clearTimeout(timer);
    }, [filterType, filterResource, startDate, endDate, searchUser]);

    // Format log description based on action type
    const getLogDescription = (log: any) => {
        const item = log.details?.name || 'bir kayıt';

        // Smart Diff Description
        if (log.action_type === 'UPDATE_PRODUCT' && log.details?.changes && !Array.isArray(log.details.changes)) {
            const changes = Object.keys(log.details.changes);
            const changeList = changes.map(key => {
                if (key === 'price') return 'fiyatı';
                if (key === 'name') return 'ismi';
                if (key === 'isAvailable') return 'durumu';
                if (key === 'image') return 'resmi';
                if (key === 'allergens') return 'alerjenleri';
                return key; // Fallback
            }).filter(Boolean).join(', ');

            return <span className="text-zinc-600"><strong>{item}</strong> adlı ürünün {changeList} güncellendi.</span>;
        }

        switch (log.action_type) {
            case 'LOGIN': return <span className="text-zinc-600">Sisteme giriş yaptı.</span>;
            case 'LOGIN_FAILED': return <span className="text-red-600">Hatalı şifre denemesi.</span>;
            case 'LOGOUT': return <span className="text-zinc-600">Çıkış yaptı.</span>;
            case 'CREATE_PRODUCT': return <span><strong>{item}</strong> adlı yeni ürün oluşturdu.</span>;
            case 'DELETE_PRODUCT': return <span className="text-red-600">Ürün sildi.</span>;
            case 'UPDATE_VENUE': return <span>Mekan ayarlarını güncelledi.</span>;
            case 'CREATE_CATEGORY':
                return <span>{log.details?.venue_name ? <strong>{log.details.venue_name}</strong> : ''} <strong>{item}</strong> kategorisini oluşturdu.</span>;
            case 'UPDATE_CATEGORY': return <span><strong>{item}</strong> kategorisini güncelledi.</span>;
            default: return <span>{log.action_type} işlemi gerçekleştirdi.</span>;
        }
    };

    const getUserLabel = (log: any) => {
        return log.details?.user_email || log.user_id?.substring(0, 8) || 'Sistem / Anonim';
    };

    const getActionBadge = (action: string) => {
        if (action.includes('LOGIN_FAILED'))
            return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 border border-red-200">LOGIN FAIL</span>;
        if (action === 'LOGIN')
            return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700 border border-green-200">LOGIN</span>;
        if (action === 'LOGOUT')
            return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">LOGOUT</span>;
        if (action.includes('CREATE'))
            return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">CREATE</span>;
        if (action.includes('UPDATE'))
            return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">UPDATE</span>;
        if (action.includes('DELETE'))
            return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 border border-red-200">DELETE</span>;

        return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">{action}</span>;
    };

    const toggleExpand = (id: string) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Sistem Kayıtları</h1>
                    <p className="text-zinc-500 mt-1">Sistemdeki tüm hareketlerin detaylı dökümü.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white text-zinc-600 rounded-full text-xs font-medium border border-zinc-200 shadow-sm">
                    <Activity className="h-4 w-4 text-green-500" />
                    Canlı İzleme Aktif
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium px-3 border-r border-zinc-100">
                    <Filter className="h-4 w-4" />
                </div>

                {/* User Search */}
                <input
                    type="text"
                    placeholder="Kullanıcı Ara..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="h-9 px-3 min-w-[150px] flex-1 rounded-lg text-sm bg-transparent border border-zinc-200 hover:border-primary/50 focus:border-primary focus:bg-white outline-none transition-all placeholder:text-zinc-400"
                />

                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="h-9 px-3 rounded-lg text-sm text-zinc-700 bg-transparent hover:bg-zinc-50 border border-transparent hover:border-zinc-200 outline-none cursor-pointer"
                >
                    {ACTION_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>

                <select
                    value={filterResource}
                    onChange={(e) => setFilterResource(e.target.value)}
                    className="h-9 px-3 rounded-lg text-sm text-zinc-700 bg-transparent hover:bg-zinc-50 border border-transparent hover:border-zinc-200 outline-none cursor-pointer"
                >
                    <option value="ALL">Tüm Kaynaklar</option>
                    <option value="auth">Kimlik (Auth)</option>
                    <option value="product">Ürün</option>
                    <option value="venue">Mekan</option>
                    <option value="allergen">Alerjen</option>
                    <option value="category">Kategori</option>
                </select>

                {/* Date Inputs - Compact */}
                <div className="flex items-center gap-2 bg-zinc-50/50 p-1 rounded-lg border border-zinc-100">
                    <Clock className="h-3 w-3 text-zinc-400 ml-2" />
                    <input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent text-xs text-zinc-600 outline-none w-28 sm:w-32"
                    />
                    <span className="text-zinc-300">-</span>
                    <input
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent text-xs text-zinc-600 outline-none w-28 sm:w-32"
                    />
                </div>

                <Button variant="ghost" size="sm" onClick={() => { setFilterType('ALL'); setFilterResource('ALL'); setStartDate(''); setEndDate(''); setSearchUser(''); }} className="ml-auto text-zinc-400 hover:text-zinc-900 text-xs">
                    Temizle
                </Button>
            </div>

            <Card className="border-zinc-200 shadow-sm overflow-hidden bg-white">
                <div className="min-w-full">
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-50/80 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        <div className="col-span-1">Tür</div>
                        <div className="col-span-3">Kullanıcı</div>
                        <div className="col-span-5">Açıklama</div>
                        <div className="col-span-2 text-right">Zaman</div>
                        <div className="col-span-1"></div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                            <span className="text-sm text-zinc-400">Yükleniyor...</span>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-20 text-zinc-400 text-sm">
                            Kayıt bulunamadı.
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-50">
                            {logs.map((log) => {
                                const isExpanded = expandedLogId === log.id;
                                return (
                                    <div key={log.id} className="group transition-colors hover:bg-zinc-50/50">
                                        <div
                                            className="grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer"
                                            onClick={() => toggleExpand(log.id)}
                                        >
                                            <div className="col-span-1">
                                                {getActionBadge(log.action_type)}
                                            </div>
                                            <div className="col-span-3 text-sm font-medium text-zinc-800 truncate" title={getUserLabel(log)}>
                                                {getUserLabel(log)}
                                            </div>
                                            <div className="col-span-5 text-sm text-zinc-600 truncate pr-4">
                                                {getLogDescription(log)}
                                            </div>
                                            <div className="col-span-2 text-right text-xs text-zinc-400 font-mono">
                                                {new Date(log.created_at).toLocaleString('tr-TR')}
                                            </div>
                                            <div className="col-span-1 flex justify-end text-zinc-300 group-hover:text-zinc-500">
                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </div>
                                        </div>

                                        {/* Expanded Detail Panel */}
                                        {isExpanded && (
                                            <div className="px-6 pb-6 pt-2 bg-zinc-50/50 border-t border-zinc-100 animate-in slide-in-from-top-1">
                                                <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm">

                                                    {/* If updates contain specific changes (diff) */}
                                                    {log.details?.changes && !Array.isArray(log.details.changes) && Object.keys(log.details.changes).length > 0 && (
                                                        <div className="mb-4">
                                                            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                                <Edit2 className="h-3 w-3" />
                                                                Değişiklik Özeti
                                                            </h4>
                                                            <div className="overflow-hidden rounded-md border border-zinc-200">
                                                                <table className="w-full text-xs text-left">
                                                                    <thead className="bg-zinc-50 text-zinc-500 font-semibold">
                                                                        <tr>
                                                                            <th className="px-3 py-2 border-r border-zinc-200 w-1/4">Alan</th>
                                                                            <th className="px-3 py-2 border-r border-zinc-200 w-1/3 bg-red-50/50 text-red-600">Eski Değer</th>
                                                                            <th className="px-3 py-2 bg-green-50/50 text-green-600">Yeni Değer</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-zinc-100">
                                                                        {Object.entries(log.details.changes).map(([field, change]: [string, any]) => {
                                                                            // Special handling for allergens
                                                                            if (field === 'allergens' && change.diff) {
                                                                                return (
                                                                                    <tr key={field} className="hover:bg-zinc-50/50">
                                                                                        <td className="px-3 py-2 font-medium text-zinc-700 capitalize border-r border-zinc-200">Alerjenler</td>
                                                                                        <td className="px-3 py-2 text-zinc-600 border-r border-zinc-200 font-mono" colSpan={2}>
                                                                                            <div className="flex gap-2">
                                                                                                {change.diff.added.length > 0 && (
                                                                                                    <span className="text-green-600">+ Eklendi: {change.diff.added.join(', ')}</span>
                                                                                                )}
                                                                                                {change.diff.removed.length > 0 && (
                                                                                                    <span className="text-red-600">- Çıkarıldı: {change.diff.removed.join(', ')}</span>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                )
                                                                            }

                                                                            return (
                                                                                <tr key={field} className="hover:bg-zinc-50/50">
                                                                                    <td className="px-3 py-2 font-medium text-zinc-700 capitalize border-r border-zinc-200">
                                                                                        {field === 'isAvailable' ? 'Durum' :
                                                                                            field === 'price' ? 'Fiyat' :
                                                                                                field === 'name' ? 'Ürün Adı' : field}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-zinc-600 border-r border-zinc-200 font-mono">
                                                                                        {typeof change.from === 'boolean' ? (change.from ? 'Aktif' : 'Pasif') : String(change.from)}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-zinc-900 font-medium font-mono">
                                                                                        {typeof change.to === 'boolean' ? (change.to ? 'Aktif' : 'Pasif') : String(change.to)}
                                                                                    </td>
                                                                                </tr>
                                                                            )
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 flex items-center gap-2 mt-4">
                                                        <Activity className="h-3 w-3" />
                                                        Teknik Detaylar (JSON)
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="block text-xs text-zinc-400 mb-1">İşlem ID</span>
                                                            <code className="font-mono text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded">{log.id}</code>
                                                        </div>
                                                        <div>
                                                            <span className="block text-xs text-zinc-400 mb-1">Kaynak (Resource)</span>
                                                            <span className="font-medium text-zinc-800">{log.resource}</span>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <span className="block text-xs text-zinc-400 mb-1">Ham Veri (JSON)</span>
                                                            <pre className="bg-zinc-900 text-zinc-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                                                                {JSON.stringify(log.details, null, 2) || '{}'}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
