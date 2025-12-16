import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Brain, Zap, FileText, ArrowRight } from 'lucide-react';

const Home = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-800">

            {/* ❌ J'ai supprimé la <nav> qui était ici pour éviter le doublon */}

            {/* --- HERO SECTION --- */}
            {/* J'ai gardé pt-32 pour laisser la place à la Navbar de App.jsx */}
            <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-blue-50 to-white overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">

                    {/* Texte Gauche */}
                    <div className="lg:w-1/2 text-center lg:text-left z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
                            Nouvelle IA MobileNetV3 disponible
                        </div>
                        <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6 text-slate-900">
                            Le futur du dépistage <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                Oculaire par IA
              </span>
                        </h1>
                        <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                            Analysez vos fonds d'œil en quelques secondes grâce à notre intelligence artificielle avancée. Détectez les signes précoces de glaucome avec une précision de 98%.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Link to="/signup" className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl hover:shadow-2xl">
                                Commencer le diagnostic <ArrowRight className="h-5 w-5" />
                            </Link>
                            {/* J'ai changé le lien ici pour pointer vers /app si on est déjà connecté (optionnel) */}
                            <Link to="/login" className="flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all">
                                Se connecter
                            </Link>
                        </div>

                        <div className="mt-10 flex items-center justify-center lg:justify-start gap-8 text-slate-400 grayscale opacity-70">
                            <span className="font-bold text-xl">CliniqueX</span>
                            <span className="font-bold text-xl">MediTech</span>
                            <span className="font-bold text-xl">HealthAI</span>
                        </div>
                    </div>

                    {/* Image Droite (Illustration abstraite) */}
                    <div className="lg:w-1/2 relative">
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                        <div className="relative bg-white border border-slate-100 rounded-3xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-all duration-500">
                            <div className="bg-slate-100 rounded-2xl h-64 w-full mb-4 flex items-center justify-center overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-900/10"></div>
                                <Eye size={64} className="text-blue-300" />
                                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-sm font-semibold text-slate-700">Analyse terminée</span>
                                    </div>
                                    <span className="text-blue-600 font-bold text-sm">98.5% Confiance</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FEATURES --- */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Pourquoi choisir GlaucomaAI ?</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                            Une technologie de pointe conçue pour assister les professionnels de santé et rassurer les patients.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Brain className="h-8 w-8 text-purple-600" />}
                            title="Deep Learning Avancé"
                            desc="Utilise l'architecture MobileNetV3 pour détecter les anomalies subtiles invisibles à l'œil nu."
                            color="bg-purple-50"
                        />
                        <FeatureCard
                            icon={<Zap className="h-8 w-8 text-yellow-600" />}
                            title="Résultats Instantanés"
                            desc="Obtenez une analyse complète et une carte de chaleur (GradCAM) en moins de 5 secondes."
                            color="bg-yellow-50"
                        />
                        <FeatureCard
                            icon={<FileText className="h-8 w-8 text-blue-600" />}
                            title="Rapports Médicaux"
                            desc="Générez automatiquement des rapports PDF détaillés prêts à être partagés avec votre ophtalmologue."
                            color="bg-blue-50"
                        />
                    </div>
                </div>
            </section>

            {/* --- HOW IT WORKS --- */}
            <section className="py-20 bg-slate-50 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>
                    <div className="grid md:grid-cols-3 gap-8 text-center relative">
                        <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-slate-200 -z-10"></div>

                        <Step number="1" title="Créez un compte" desc="Inscrivez-vous gratuitement pour accéder à la plateforme sécurisée." />
                        <Step number="2" title="Téléversez l'image" desc="Utilisez une image de fond d'œil (format JPG ou PNG)." />
                        <Step number="3" title="Obtenez le diagnostic" desc="Visualisez les zones à risque et téléchargez votre rapport." />
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="bg-slate-900 text-slate-400 py-12">
                <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-4 text-white">
                            <Eye className="h-6 w-6" />
                            <span className="text-xl font-bold">GlaucomaAI</span>
                        </div>
                        <p className="max-w-xs">
                            L'intelligence artificielle au service de la santé oculaire. Prévention, détection, action.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">Liens</h4>
                        <ul className="space-y-2">
                            <li><Link to="/" className="hover:text-blue-400">Accueil</Link></li>
                            <li><Link to="/login" className="hover:text-blue-400">Connexion</Link></li>
                            <li><Link to="/signup" className="hover:text-blue-400">Inscription</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">Légal</h4>
                        <ul className="space-y-2">
                            <li><a href="#" className="hover:text-blue-400">Confidentialité</a></li>
                            <li><a href="#" className="hover:text-blue-400">Conditions</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-center text-sm">
                    © 2024 GlaucomaAI Project. Tous droits réservés.
                </div>
            </footer>
        </div>
    );
};

// Petits composants utilitaires
const FeatureCard = ({ icon, title, desc, color }) => (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-shadow group">
        <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
);

const Step = ({ number, title, desc }) => (
    <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-white border-4 border-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-sm">
            {number}
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 max-w-xs">{desc}</p>
    </div>
);

export default Home;