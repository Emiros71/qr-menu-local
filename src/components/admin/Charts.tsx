"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell
} from 'recharts';
// Card components imported but not used in this file; Charts are self-contained
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

// Mock Data for Charts
const dataTraffic = [
    { name: 'Pzt', uv: 4000, pv: 2400 },
    { name: 'Sal', uv: 3000, pv: 1398 },
    { name: 'Çar', uv: 2000, pv: 9800 },
    { name: 'Per', uv: 2780, pv: 3908 },
    { name: 'Cum', uv: 1890, pv: 4800 },
    { name: 'Cmt', uv: 2390, pv: 3800 },
    { name: 'Paz', uv: 3490, pv: 4300 },
];

const dataTopProducts = [
    { name: 'Antrikot', sales: 450 },
    { name: 'Burger', sales: 320 },
    { name: 'Latte', sales: 210 },
    { name: 'Pizza', sales: 180 },
    { name: 'Tiramisu', sales: 150 },
];

const dataCategories = [
    { name: 'Ana Yemek', value: 400 },
    { name: 'İçecek', value: 300 },
    { name: 'Tatlı', value: 300 },
    { name: 'Başlangıç', value: 200 },
];

const COLORS = ['#860B5B', '#C5A065', '#9CA3AF', '#F3F4F6'];

export function MainTrafficChart() {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dataTraffic}>
                <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#860B5B" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#860B5B" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="uv" stroke="#860B5B" fillOpacity={1} fill="url(#colorUv)" />
            </AreaChart>
        </ResponsiveContainer>
    );
}

export function TopProductsChart() {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataTopProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="sales" fill="#C5A065" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function CategoryDistributionChart() {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={dataCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                >
                    {dataCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
            </PieChart>
        </ResponsiveContainer>
    );
}

export interface VisitorData {
    date: string;
    count: number;
}

export interface ProductData {
    name: string;
    clicks: number;
    originalName: string;
}

export function VisitorAreaChart({ data }: { data: VisitorData[] }) {
    if (!data || data.length === 0) return null;
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.6 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.6 }} />
                <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid currentColor', background: 'var(--background)', color: 'var(--foreground)' }}
                />
                <Area type="monotone" dataKey="count" name="Ziyaretçi" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
        </ResponsiveContainer>
    );
}

export function ProductBarChart({ data }: { data: ProductData[] }) {
    if (!data || data.length === 0) return null;
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="currentColor" opacity={0.1} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.8 }} width={100} />
                <Tooltip
                    cursor={{ fill: 'currentColor', opacity: 0.05 }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid currentColor', background: 'var(--background)', color: 'var(--foreground)' }}
                />
                <Bar dataKey="clicks" name="Tıklama" fill="#3b82f6" opacity={0.8} radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
        </ResponsiveContainer>
    );
}
