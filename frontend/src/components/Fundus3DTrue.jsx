import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const Terrain = ({ imageUrl }) => {
  // Charge la texture. useTexture gère le cache et les promesses.
  const texture = useTexture(imageUrl);
  
  // Paramètres de répétition (optionnel pour une image unique, mais bon pour la stabilité)
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      {/* PlaneGeometry args: [width, height, widthSegments, heightSegments]
         Plus il y a de segments (256), plus le relief est détaillé, mais plus c'est lourd.
      */}
      <planeGeometry args={[3, 3, 256, 256]} />
      <meshStandardMaterial
        map={texture}
        displacementMap={texture} // On utilise l'image elle-même comme carte de hauteur
        displacementScale={0.4}   // Intensité du relief
        metalness={0.2}
        roughness={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default function Fundus3DTrue({ imageUrl }) {
  if (!imageUrl) return null;

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shadow-inner relative">
       {/* Petit label pour distinguer du visualiseur parallaxe */}
      <div className="absolute top-2 left-2 z-10 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
        WebGL True 3D
      </div>
      
      <Canvas camera={{ position: [0, 2.5, 2.5], fov: 50 }}>
        {/* Lumières pour donner du volume au relief */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="blue" />

        <Suspense fallback={null}>
           <Terrain imageUrl={imageUrl} />
        </Suspense>

        <OrbitControls 
          enableZoom={true} 
          enablePan={true} 
          enableRotate={true}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}