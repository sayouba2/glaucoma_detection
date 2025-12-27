import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
    const { t, i18n } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // 1. Validation manuelle (remplace celle du navigateur)
        if (!email || !password) {
            return setError(t('auth.error_creds'));
        }

        // 2. Vérification du format Email (Regex)
        // Cela remplace le popup "Veuillez inclure un @" du navigateur
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return setError(t('auth.error_email_invalid')); // Utilise le message traduit
        }

        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('username', email);
            params.append('password', password);

            const resp = await fetch('http://localhost:8000/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept-Language': i18n.language
                },
                body: params.toString(),
            });

            if (!resp.ok) {
                const body = await resp.json().catch(()=>({ detail: t('auth.error_login') }));
                throw new Error(body.detail || t('auth.error_login'));
            }

            const data = await resp.json();
            if (!data.access_token) throw new Error(t('auth.error_token'));

            localStorage.setItem('token', data.access_token);
            window.location.href = '/dashboard';
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 pt-24 px-4">
            <div className="max-w-5xl w-full mx-auto flex rounded-3xl overflow-hidden shadow-2xl bg-white min-h-[600px] fade-in border border-slate-100">

                {/* Côté Gauche */}
                <div className="hidden md:flex w-1/2 bg-blue-600 relative flex-col justify-between p-12 text-white">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90"></div>
                    <div className="absolute inset-0" style={{backgroundImage: 'url("https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80")', backgroundSize: 'cover', mixBlendMode: 'overlay'}}></div>
                    <div className="relative z-10">
                        <h2 className="text-4xl font-bold mb-4">{t('auth.welcome_back')}</h2>
                        <p className="text-blue-100 text-lg">{t('auth.promo_text')}</p>
                    </div>
                    <div className="relative z-10 text-sm text-blue-200">© 2024 Glaucoma Detection AI</div>
                </div>

                {/* Côté Droit */}
                <div className="w-full md:w-1/2 p-12 flex flex-col justify-center bg-white relative">
                    <div className="max-w-sm mx-auto w-full">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">{t('auth.login_title')}</h2>
                        <p className="text-slate-500 mb-8">{t('auth.login_subtitle')}</p>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-center border border-red-100 animate-pulse">
                                ⚠️ {error}
                            </div>
                        )}

                        {/* ✅ AJOUT DE noValidate ICI : Empêche le navigateur d'afficher ses propres erreurs */}
                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">{t('auth.email')}</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-slate-400 h-5 w-5" />
                                    <input
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                        type="email"
                                        placeholder={t('auth.placeholder_email')}
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">{t('auth.password')}</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-slate-400 h-5 w-5" />
                                    <input
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin h-5 w-5"/> : <>{t('auth.login_btn')} <ArrowRight className="h-5 w-5" /></>}
                            </button>
                        </form>

                        <div className="mt-8 text-center text-sm text-slate-500">
                            {t('auth.no_account')} <a href="/signup" className="text-blue-600 font-semibold hover:underline">{t('auth.create_account')}</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}