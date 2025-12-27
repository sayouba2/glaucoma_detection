import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // ✅ Import du hook
import './i18n'; // ✅ IMPORT CRUCIAL POUR ACTIVER LA TRADUCTION
import ImageUploader from './components/ImageUploader.jsx';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import Home from './components/Home.jsx';
import { Activity, LogOut, Clock, User, Home as HomeIcon, LayoutDashboard, Globe } from 'lucide-react'; // ✅ Ajout Globe
import './App.css';
import History from './components/History.jsx';
import ChatBot from './components/ChatBot';
import Dashboard from './components/Dashboard';
import ReportEditor from './components/ReportEditor';


// 1. Composant pour protéger les routes
const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" replace />;
};
const Loading = () => (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Chargement / Loading...</p>
        </div>
    </div>
);
// Composant pour les liens actifs
function NavLink({ to, children, icon: Icon }) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
            }`}
        >
            {Icon && <Icon size={18} />}
            <span className="font-medium">{children}</span>
        </Link>
    );
}

function NavBar() {
    const { t, i18n } = useTranslation(); // ✅ Hook
    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/';
    };

    // Fonction pour changer la langue
    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
            <div className="max-w-7xl mx-auto bg-white/80 backdrop-blur-md border border-white/20 shadow-xl shadow-slate-200/50 rounded-2xl flex justify-between items-center px-6 py-3">

                {/* Logo Area */}
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                        <Activity size={24} />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-cyan-500">
            Glaucoma<span className="font-light text-slate-800">AI</span>
          </span>
                </Link>

                {/* Links */}
                <div className="flex items-center gap-2">
                    {/* Le lien Accueil est toujours visible */}
                    <NavLink to="/" icon={HomeIcon}>{t('nav.home')}</NavLink> {/* ✅ Traduit */}

                    {!token ? (
                        <>
                            <div className="w-px h-6 bg-slate-200 mx-2"></div>
                            <NavLink to="/login" icon={User}>{t('nav.login')}</NavLink> {/* ✅ Traduit */}
                            <Link
                                to="/signup"
                                className="ml-2 px-6 py-2 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                {t('nav.signup')} {/* ✅ Traduit */}
                            </Link>
                        </>
                    ) : (
                        <>
                            <NavLink to="/dashboard" icon={LayoutDashboard}>{t('nav.dashboard')}</NavLink> {/* ✅ Traduit */}
                            <NavLink to="/history" icon={Clock}>{t('nav.history')}</NavLink> {/* ✅ Traduit */}

                            <div className="w-px h-6 bg-slate-200 mx-2"></div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-full transition-colors font-medium"
                            >
                                <LogOut size={18} />
                                {t('nav.logout')} {/* ✅ Traduit */}
                            </button>
                        </>
                    )}

                    {/* ✅ SÉLECTEUR DE LANGUE (NOUVEAU) */}
                    <div className="relative group ml-2">
                        <button className="flex items-center gap-1 text-slate-600 hover:text-blue-600 px-3 py-2 rounded-full hover:bg-slate-100 transition-colors">
                            <Globe size={18} />
                            <span className="uppercase font-bold text-xs">{i18n.language}</span>
                        </button>

                        {/* Dropdown au survol */}
                        <div className="absolute right-0 top-full mt-2 w-32 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden hidden group-hover:block animate-in fade-in slide-in-from-top-2">
                            <button onClick={() => changeLanguage('fr')} className="block w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">🇫🇷 Français</button>
                            <button onClick={() => changeLanguage('en')} className="block w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">🇬🇧 English</button>
                            <button onClick={() => changeLanguage('es')} className="block w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">🇪🇸 Español</button>
                            <button onClick={() => changeLanguage('ar')} className="block w-full text-right px-4 py-2 hover:bg-slate-50 text-sm font-arabic">🇸🇦 العربية</button>
                        </div>
                    </div>

                </div>
            </div>
        </nav>
    );
}

function AppContent() {
    // ✅ GESTION RTL AUTOMATIQUE
    const { i18n } = useTranslation();

    useEffect(() => {
        // ❌ AVANT (Ce qui inversait l'écran) :
        document.body.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

        // ✅ APRÈS (On force la direction Gauche -> Droite pour tout le monde) :
       // document.body.dir = 'ltr';

        // On garde juste le changement de police (optionnel) pour que l'arabe soit joli
        document.body.className = i18n.language === 'ar' ? 'font-arabic bg-slate-50' : 'font-sans bg-slate-50';
    }, [i18n.language]);

    return (
        <>
            <NavBar />
            <main className="min-h-screen selection:bg-blue-100 selection:text-blue-900">
                <Routes>
                    {/* Route Publique : Accueil */}
                    <Route path="/" element={<Home />} />

                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />

                    {/* Routes Protégées */}
                    <Route
                        path="/app"
                        element={
                            <PrivateRoute>
                                <div className="pt-32 px-4 pb-10">
                                    <ImageUploader />
                                </div>
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/history"
                        element={
                            <PrivateRoute>
                                <div className="pt-32 px-4 pb-10">
                                    <History />
                                </div>
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/dashboard"
                        element={
                            <PrivateRoute>
                                <div className="pt-32 px-4 pb-10">
                                    <Dashboard />
                                </div>
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/report-editor"
                        element={
                            <PrivateRoute>
                                <div className="pt-20 px-4 pb-10">
                                    <ReportEditor />
                                </div>
                            </PrivateRoute>
                        }
                    />
                </Routes>
            </main>
            <ChatBot />
        </>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={<Loading />}>
            <AppContent />
            </Suspense>
        </BrowserRouter>
    );
}