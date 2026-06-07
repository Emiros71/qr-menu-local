"use client";

import { useState, useEffect } from 'react';
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

    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    const supabase = createClient();

    useEffect(() => {
        const storedLockout = localStorage.getItem('login_lockout_until');
        const storedAttempts = localStorage.getItem('login_failed_attempts');

        if (storedAttempts) {
            setFailedAttempts(parseInt(storedAttempts, 10));
        }

        if (storedLockout) {
            const lockoutTime = parseInt(storedLockout, 10);
            if (lockoutTime > Date.now()) {
                setLockoutUntil(lockoutTime);
            } else {
                localStorage.removeItem('login_lockout_until');
                localStorage.removeItem('login_failed_attempts');
                setLockoutUntil(null);
                setFailedAttempts(0);
            }
        }
    }, []);

    useEffect(() => {
        if (!lockoutUntil) return;

        const interval = setInterval(() => {
            const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
            if (remaining <= 0) {
                setLockoutUntil(null);
                setFailedAttempts(0);
                localStorage.removeItem('login_lockout_until');
                localStorage.removeItem('login_failed_attempts');
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lockoutUntil]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (lockoutUntil) return;

        setLoading(true);
        setError(null);

        try {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                const isInvalidCreds = signInError.message === 'Invalid login credentials';
                const errorMessage = isInvalidCreds ? 'E-posta veya sifre hatali.' : signInError.message;

                setError(errorMessage);

                const newAttempts = failedAttempts + 1;
                setFailedAttempts(newAttempts);
                localStorage.setItem('login_failed_attempts', newAttempts.toString());

                if (newAttempts >= 3) {
                    const lockoutTime = Date.now() + 30000;
                    setLockoutUntil(lockoutTime);
                    localStorage.setItem('login_lockout_until', lockoutTime.toString());
                }
            } else {
                const session = signInData.session ?? (await supabase.auth.getSession()).data.session;

                if (!session) {
                    setError('Giris basarili oldu ama oturum olusturulamadi. Lutfen tekrar deneyin.');
                    return;
                }

                setFailedAttempts(0);
                setLockoutUntil(null);
                localStorage.removeItem('login_failed_attempts');
                localStorage.removeItem('login_lockout_until');

                AuditService.log({
                    action: 'LOGIN',
                    resource: 'auth',
                    details: { email }
                });

                window.location.assign('/admin');
            }
        } catch (err) {
            console.error('Login failed unexpectedly:', err);
            setError(err instanceof Error ? err.message : 'Beklenmeyen bir hata olustu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            <div className="w-full max-w-[400px] relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 text-white mb-6 shadow-lg shadow-zinc-900/10">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                        Guvenli Yonetim Paneli
                    </h1>
                    <p className="text-zinc-500 text-sm mt-2">
                        Erisim kisitlamali alandir. Tum islemler kayit altina alinmaktadir.
                    </p>
                </div>

                {error && !lockoutUntil && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-600 text-sm animate-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                {lockoutUntil && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800 text-sm animate-pulse">
                        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Cok fazla basarisiz deneme.</p>
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
                        <label className="text-[13px] font-medium text-zinc-700">Sifre</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11 bg-white border-zinc-200 focus:border-zinc-400 focus:ring-zinc-100 text-zinc-900 transition-all rounded-lg"
                            placeholder="********"
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
                                {lockoutUntil ? 'Kilitlendi' : 'Guvenli Giris'}
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
