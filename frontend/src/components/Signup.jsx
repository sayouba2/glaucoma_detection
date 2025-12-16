import React, { useState } from 'react';
import api from '../utils/api';
import { Mail, Lock, UserPlus, CheckCircle, Loader2 } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // LOGIQUE INCHANGÉE
  const validate = () => {
    if (!email || !password) return 'Email et mot de passe requis.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email invalide.';
    if (password.length < 8) return 'Mot de passe: minimum 8 caractères.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const err = validate();
    if (err) return setError(err);

    setLoading(true);
    try {
      const res = await api.post('/signup', { email, password });
      setSuccess('Compte créé. Vous pouvez vous connecter.');
      setEmail(''); setPassword('');
      setTimeout(() => { window.location.href = '/login'; }, 900);
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Erreur création compte';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // NOUVEAU DESIGN
  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 relative overflow-hidden fade-in">
        
        {/* Décoration de fond */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600"></div>

        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4 text-blue-600">
                <UserPlus size={32} />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Créer un compte</h2>
            <p className="text-slate-500 mt-2">Rejoignez la communauté GlaucomaAI</p>
        </div>

        {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 flex items-center gap-2">
               <span>⚠️</span> {error}
            </div>
        )}
        {success && (
            <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm mb-6 border border-green-100 flex items-center gap-2">
               <CheckCircle size={18} /> {success}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">Email professionnel</label>
                <div className="relative group">
                    <Mail className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors h-5 w-5" />
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
                <label className="text-sm font-semibold text-slate-700 ml-1">Mot de passe</label>
                <div className="relative group">
                    <Lock className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors h-5 w-5" />
                    <input 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" 
                        type="password" 
                        placeholder="Minimum 8 caractères"
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                    />
                </div>
            </div>

            <button 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-2 mt-4" 
                disabled={loading}
            >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "S'inscrire gratuitement"}
            </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
            Déjà inscrit ? <a href="/login" className="text-blue-600 font-semibold hover:underline">Se connecter</a>
        </div>
      </div>
    </div>
  );
}