import React, { useRef, Suspense, Component } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { AlertTriangle } from 'lucide-react';

// 1. COMPOSANT DE SÉCURITÉ (Error Boundary)
// Si une erreur survient dans la 3D, ce composant l'attrape et affiche un message au lieu de l'écran blanc.
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
            return (
                <Html center>
                    <div className="flex flex-col items-center justify-center text-red-500 bg-white p-4 rounded-lg shadow-xl border border-red-100 w-64 text-center">
                        <AlertTriangle size={24} className="mb-2" />
                        <p className="text-xs font-bold">Impossible de charger la 3D</p>
                        <p className="text-[10px] text-slate-500 mt-1">Problème de sécurité (CORS) ou image inaccessible.</p>
                    </div>
                </Html>
            );
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
const Loader = () => (
    <Html center>
        <div className="text-white text-xs bg-slate-800 px-3 py-1 rounded-full animate-pulse">
            Chargement du relief...
        </div>
    </Html>
);

// 4. COMPOSANT PRINCIPAL
export default function Fundus3DViewer({ imageUrl }) {
    // Sécurité : Si pas d'image, on ne rend rien
    if (!imageUrl) return (
        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-sm">
            Pas d'image disponible
        </div>
    );

    return (
        <div className="w-full h-full min-h-[300px] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700 relative">
            <div className="absolute top-4 left-4 z-10 bg-slate-800/80 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur">
                Topographie 3D
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