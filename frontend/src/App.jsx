import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import ImageUploader from './components/ImageUploader.jsx';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import { Activity, LogOut, User, Home } from 'lucide-react';
import './App.css';

// Petit composant pour les liens actifs
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
          <NavLink to="/" icon={Home}>Accueil</NavLink>
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
               <div className="w-px h-6 bg-slate-200 mx-2"></div>
               <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-full transition-colors font-medium"
              >
                <LogOut size={18} />
                Déconnexion
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// Wrapper pour récupérer useLocation dans NavBar (car NavBar est dans BrowserRouter)
function AppContent() {
    return (
        <>
            <NavBar />
            <main className="pt-32 pb-10 px-4 min-h-screen bg-slate-50 selection:bg-blue-100 selection:text-blue-900">
                <Routes>
                    <Route path="/" element={<ImageUploader />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                </Routes>
            </main>
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