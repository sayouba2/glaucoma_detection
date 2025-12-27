import React, { useRef, Suspense, Component } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next'; // ✅ Import du hook
import * as THREE from 'three';
import { AlertTriangle } from 'lucide-react';

// 0. COMPOSANT D'AFFICHAGE D'ERREUR (Fonctionnel pour utiliser le hook de traduction)
const ErrorDisplay = () => {
    const { t } = useTranslation();
    return (
        <Html center>
            <div className="flex flex-col items-center justify-center text-red-500 bg-white p-4 rounded-lg shadow-xl border border-red-100 w-64 text-center">
                <AlertTriangle size={24} className="mb-2" />
                <p className="text-xs font-bold">{t('viewer.error_title')}</p> {/* ✅ Traduit */}
                <p className="text-[10px] text-slate-500 mt-1">{t('viewer.error_desc')}</p> {/* ✅ Traduit */}
            </div>
        </Html>
    );
};

// 1. COMPOSANT DE SÉCURITÉ (Error Boundary)
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Erreur 3D:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // ✅ On appelle le composant fonctionnel qui gère la traduction
            return <ErrorDisplay />;
        }
        return this.props.children;
    }
}

// 2. LE MESH (L'objet 3D)
const EyeMesh = ({ imageUrl }) => {
    const meshRef = useRef();

    // On configure le loader avec 'anonymous' pour le CORS
    const texture = useLoader(THREE.TextureLoader, imageUrl, (loader) => {
        loader.setCrossOrigin('anonymous');
    });

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[5, 5, 256, 256]} />
            <meshStandardMaterial
                map={texture}
                displacementMap={texture}
                displacementScale={0.8}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

// 3. LOADER (Pendant le chargement)
const Loader = () => {
    const { t } = useTranslation(); // ✅ Hook ajouté ici
    return (
        <Html center>
            <div className="text-white text-xs bg-slate-800 px-3 py-1 rounded-full animate-pulse">
                {t('viewer.loading')} {/* ✅ Traduit */}
            </div>
        </Html>
    );
};

// 4. COMPOSANT PRINCIPAL
export default function Fundus3DViewer({ imageUrl }) {
    const { t } = useTranslation(); // ✅ Hook ajouté ici

    // Sécurité : Si pas d'image, on ne rend rien
    if (!imageUrl) return (
        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-sm">
            {t('viewer.no_image')} {/* ✅ Traduit */}
        </div>
    );

    return (
        <div className="w-full h-full min-h-[300px] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700 relative">
            <div className="absolute top-4 left-4 z-10 bg-slate-800/80 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur">
                {t('viewer.badge')} {/* ✅ Traduit */}
            </div>

            <Canvas camera={{ position: [0, 5, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                {/* On enveloppe tout avec ErrorBoundary ET Suspense */}
                <ErrorBoundary>
                    <Suspense fallback={<Loader />}>
                        <EyeMesh imageUrl={imageUrl} />
                    </Suspense>
                </ErrorBoundary>

                <OrbitControls enableZoom={true} />
            </Canvas>
        </div>
    );
}