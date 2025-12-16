import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // LOGIQUE INCHANGÉE
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) return setError('Email et mot de passe requis.');
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('username', email);
            params.append('password', password);

            const resp = await fetch('http://localhost:8000/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
            });

            if (!resp.ok) {
                const body = await resp.json().catch(()=>({ detail: 'Connexion échouée' }));
                throw new Error(body.detail || 'Connexion échouée');
            }

            const data = await resp.json();
            if (!data.access_token) throw new Error('Jeton non reçu');

            localStorage.setItem('token', data.access_token);
            window.location.href = '/app';
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // NOUVEAU DESIGN AJUSTÉ
    return (
        /* 1. min-h-screen : Prend toute la hauteur
           2. pt-20 : Ajoute de l'espace en haut pour la Navbar
           3. flex items-center justify-center : Centre la carte parfaitement
           4. bg-slate-50 : Petit fond gris pour faire ressortir la carte blanche
        */
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 pt-24 px-4">

            <div className="max-w-5xl w-full mx-auto flex rounded-3xl overflow-hidden shadow-2xl bg-white min-h-[600px] fade-in border border-slate-100">

                {/* Côté Gauche : Visuel */}
                <div className="hidden md:flex w-1/2 bg-blue-600 relative flex-col justify-between p-12 text-white">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90"></div>
                    <div className="absolute inset-0" style={{backgroundImage: 'url("https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80")', backgroundSize: 'cover', mixBlendMode: 'overlay'}}></div>

                    <div className="relative z-10">
                        <h2 className="text-4xl font-bold mb-4">Bienvenue</h2>
                        <p className="text-blue-100 text-lg">Accédez à notre plateforme d'analyse ophtalmologique assistée par intelligence artificielle.</p>
                    </div>

                    <div className="relative z-10 text-sm text-blue-200">
                        © 2024 Glaucoma Detection AI
                    </div>
                </div>

                {/* Côté Droit : Formulaire */}
                <div className="w-full md:w-1/2 p-12 flex flex-col justify-center bg-white relative">
                    <div className="max-w-sm mx-auto w-full">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">Se connecter</h2>
                        <p className="text-slate-500 mb-8">Entrez vos identifiants pour continuer.</p>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-center border border-red-100 animate-pulse">
                                ⚠️ {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-slate-400 h-5 w-5" />
                                    <input
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                        type="email"
                                        placeholder="nom@exemple.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Mot de passe</label>
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

                            <button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5"/> : (
                                    <>
                                        Se connecter <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center text-sm text-slate-500">
                            Pas encore de compte ? <a href="/signup" className="text-blue-600 font-semibold hover:underline">Créer un compte</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}