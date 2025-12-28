"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loader2, ArrowRight, AlertCircle, ShieldAlert, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuditService } from '@/services/audit-service';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Security State
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    const router = useRouter();
    const supabase = createClient();

    // Check Lockout Timer
    useEffect(() => {
        if (lockoutUntil) {
            const interval = setInterval(() => {
                const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
                if (remaining <= 0) {
                    setLockoutUntil(null);
                    setFailedAttempts(0); // Reset attempts after lockout
                } else {
                    setTimeLeft(remaining);
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [lockoutUntil]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Brute Force Check
        if (lockoutUntil) return;

        setLoading(true);
        setError(null);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                // Determine error type
                const isInvalidCreds = signInError.message === "Invalid login credentials";
                const errorMessage = isInvalidCreds ? "E-posta veya şifre hatalı." : signInError.message;

                setError(errorMessage);

                // Increase security counter
                const newAttempts = failedAttempts + 1;
                setFailedAttempts(newAttempts);

                // Log Failure (High Priority Security Event)
                AuditService.log({
                    action: 'LOGIN_FAILED',
                    resource: 'auth',
                    details: { email, error: signInError.message, attempt: newAttempts }
                });

                // Lockout logic: Lock for 30s after 3 attempts
                if (newAttempts >= 3) {
                    setLockoutUntil(Date.now() + 30000); // 30 seconds
                }

            } else {
                // Success!
                AuditService.log({
                    action: 'LOGIN',
                    resource: 'auth',
                    details: { email }
                });

                router.push('/admin');
                router.refresh();
            }
        } catch (err) {
            setError('Beklenmeyen bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            <div className="w-full max-w-[400px] relative z-10">
                {/* Logo / Brand Area */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 text-white mb-6 shadow-lg shadow-zinc-900/10">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                        Güvenli Yönetim Paneli
                    </h1>
                    <p className="text-zinc-500 text-sm mt-2">
                        Erişim kısıtlamalı alandır. Tüm işlemler kayıt altına alınmaktadır.
                    </p>
                </div>

                {/* Feedback Message */}
                {error && !lockoutUntil && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-600 text-sm animate-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Security Lockout Message */}
                {lockoutUntil && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800 text-sm animate-pulse">
                        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Çok fazla başarısız deneme.</p>
                            <p className="mt-1 flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                {timeLeft} saniye sonra tekrar deneyin.
                            </p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-zinc-700">E-posta</label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-11 bg-white border-zinc-200 focus:border-zinc-400 focus:ring-zinc-100 text-zinc-900 transition-all rounded-lg"
                            placeholder="admin@qrmenu.com"
                            disabled={!!lockoutUntil}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-zinc-700">Şifre</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11 bg-white border-zinc-200 focus:border-zinc-400 focus:ring-zinc-100 text-zinc-900 transition-all rounded-lg"
                            placeholder="••••••••"
                            disabled={!!lockoutUntil}
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading || !!lockoutUntil}
                        className={cn(
                            "w-full h-11 text-white font-medium rounded-lg transition-all shadow-sm mt-2",
                            lockoutUntil
                                ? "bg-zinc-400 cursor-not-allowed"
                                : "bg-zinc-900 hover:bg-zinc-800 hover:shadow-md"
                        )}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                            <span className="flex items-center justify-center gap-2">
                                {lockoutUntil ? 'Kilitlendi' : 'Güvenli Giriş'}
                                {!lockoutUntil && <ArrowRight className="h-4 w-4 opacity-50" />}
                            </span>
                        )}
                    </Button>
                </form>

                <div className="mt-12 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-[10px] font-mono text-zinc-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        SYSTEM STATUS: ACTIVE
                    </div>
                </div>
            </div>
        </div>
    );
}
