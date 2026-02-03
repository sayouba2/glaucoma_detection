import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // ✅ Import du hook
import { Eye, Brain, Zap, FileText, ArrowRight } from 'lucide-react';

const Home = () => {
    const { t } = useTranslation(); // ✅ Initialisation du hook

    return (
        <div className="min-h-screen bg-white font-sans text-slate-800">

            {/* --- HERO SECTION --- */}
            <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-blue-50 to-white overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">

                    {/* Texte Gauche */}
                    <div className="lg:w-1/2 text-center lg:text-left z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
                            {t('home.new_ia_badge')} {/* ✅ Traduit */}
                        </div>
                        <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6 text-slate-900">
                            {t('home.hero_title')} <br/> {/* ✅ Traduit Partie 1 */}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                {t('home.hero_highlight')} {/* ✅ Traduit Partie 2 */}
              </span>
                        </h1>
                        <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                            {t('home.hero_desc')} {/* ✅ Traduit */}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Link to="/signup" className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl hover:shadow-2xl">
                                {t('home.cta_start')} <ArrowRight className="h-5 w-5" /> {/* ✅ Traduit */}
                            </Link>

                            <Link to="/login" className="flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all">
                                {t('home.cta_login')} {/* ✅ Traduit */}
                            </Link>
                        </div>

                        <div className="mt-10 flex items-center justify-center lg:justify-start gap-8 text-slate-400 grayscale opacity-70">
                            <span className="font-bold text-xl">CliniqueX</span>
                            <span className="font-bold text-xl">MediTech</span>
                            <span className="font-bold text-xl">HealthAI</span>
                        </div>
                    </div>

                    {/* Image Droite */}
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
                                        <span className="text-sm font-semibold text-slate-700">{t('home.img_status')}</span> {/* ✅ Traduit */}
                                    </div>
                                    <span className="text-blue-600 font-bold text-sm">98.5% {t('home.img_conf')}</span> {/* ✅ Traduit */}
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
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{t('home.why_title')}</h2> {/* ✅ Traduit */}
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                            {t('home.why_subtitle')} {/* ✅ Traduit */}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Brain className="h-8 w-8 text-purple-600" />}
                            title={t('home.feature_dl_title')} // ✅ Traduit
                            desc={t('home.feature_dl_desc')} // ✅ Traduit
                            color="bg-purple-50"
                        />
                        <FeatureCard
                            icon={<Zap className="h-8 w-8 text-yellow-600" />}
                            title={t('home.feature_speed_title')} // ✅ Traduit
                            desc={t('home.feature_speed_desc')} // ✅ Traduit
                            color="bg-yellow-50"
                        />
                        <FeatureCard
                            icon={<FileText className="h-8 w-8 text-blue-600" />}
                            title={t('home.feature_report_title')} // ✅ Traduit
                            desc={t('home.feature_report_desc')} // ✅ Traduit
                            color="bg-blue-50"
                        />
                    </div>
                </div>
            </section>

            {/* --- HOW IT WORKS --- */}
            <section className="py-20 bg-slate-50 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12">{t('home.how_title')}</h2> {/* ✅ Traduit */}
                    <div className="grid md:grid-cols-3 gap-8 text-center relative">
                        <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-slate-200 -z-10"></div>

                        <Step
                            number="1"
                            title={t('home.step_1_title')} // ✅ Traduit
                            desc={t('home.step_1_desc')} // ✅ Traduit
                        />
                        <Step
                            number="2"
                            title={t('home.step_2_title')} // ✅ Traduit
                            desc={t('home.step_2_desc')} // ✅ Traduit
                        />
                        <Step
                            number="3"
                            title={t('home.step_3_title')} // ✅ Traduit
                            desc={t('home.step_3_desc')} // ✅ Traduit
                        />
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
                            {t('home.footer_desc')} {/* ✅ Traduit */}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">{t('home.footer_links')}</h4> {/* ✅ Traduit */}
                        <ul className="space-y-2">
                            <li><Link to="/" className="hover:text-blue-400">{t('nav.home')}</Link></li> {/* ✅ Traduit */}
                            <li><Link to="/login" className="hover:text-blue-400">{t('nav.login')}</Link></li> {/* ✅ Traduit */}
                            <li><Link to="/signup" className="hover:text-blue-400">{t('nav.signup')}</Link></li> {/* ✅ Traduit */}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">{t('home.footer_legal')}</h4> {/* ✅ Traduit */}
                        <ul className="space-y-2">
                            <li><a href="#" className="hover:text-blue-400">{t('home.footer_privacy')}</a></li> {/* ✅ Traduit */}
                            <li><a href="#" className="hover:text-blue-400">{t('home.footer_terms')}</a></li> {/* ✅ Traduit */}
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-center text-sm">
                    {t('home.footer_copyright')} {/* ✅ Traduit */}
                </div>
            </footer>
        </div>
    );
};

// Petits composants utilitaires (Pas besoin de modif ici, ils reçoivent les props déjà traduites)
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