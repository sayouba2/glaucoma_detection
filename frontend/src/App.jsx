import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import ImageUploader from './components/ImageUploader.jsx';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import Home from './components/Home.jsx';
import { Activity, LogOut, Clock, User, Home as HomeIcon, LayoutDashboard } from 'lucide-react'; // ✅ Import LayoutDashboard
import './App.css';
import History from './components/History.jsx';
import ChatBot from './components/ChatBot';
import Dashboard from './components/Dashboard';
import ReportEditor from './components/ReportEditor';


// 1. Composant pour protéger les routes
// Si pas de token, on redirige vers /login
const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" replace />;
};

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
    const token = localStorage.getItem('token');
    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/';
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
                    <NavLink to="/" icon={HomeIcon}>Accueil</NavLink>

                    {!token ? (
                        <>
                            <div className="w-px h-6 bg-slate-200 mx-2"></div>
                            <NavLink to="/login" icon={User}>Connexion</NavLink>
                            <Link
                                to="/signup"
                                className="ml-2 px-6 py-2 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                S'inscrire
                            </Link>
                        </>
                    ) : (
                        <>
                            {/* ✅ CHANGEMENT ICI : Analyse supprimé, Dashboard ajouté */}
                            <NavLink to="/dashboard" icon={LayoutDashboard}>Tableau de bord</NavLink>

                            <NavLink to="/history" icon={Clock}>Historique</NavLink>

                            <div className="w-px h-6 bg-slate-200 mx-2"></div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-full transition-colors font-medium"
                            >
                                <LogOut size={18} />
                                Déconnexion
                            </button>
                        </>
                    )
                    }
                </div>
            </div>
        </nav>
    );
}

function AppContent() {
    return (
        <>
            <NavBar />
            <main className="min-h-screen bg-slate-50 selection:bg-blue-100 selection:text-blue-900">
                <Routes>
                    {/* Route Publique : Accueil */}
                    <Route path="/" element={<Home />} />

                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />

                    {/* Route Protégée : L'Application réelle (Analyse) */}
                    {/* On garde la route accessible, même si le bouton n'est plus dans le menu (accessible via le Dashboard) */}
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
            <AppContent />
        </BrowserRouter>
    );
}