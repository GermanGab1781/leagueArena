'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';

function ChampionModel() {
    const gltf = useGLTF('/models/Darius/Darius.glb');
    return <primitive object={gltf.scene} scale={0.01} />;
}

export default function TestViewer() {
    return (
        <div className="w-full h-screen border">

            <Canvas camera={{ position: [10, 10, 3], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[2, 2, 2]} />
                <Suspense fallback={null}>
                    <ChampionModel />
                    <OrbitControls />
                </Suspense>
            </Canvas>
        </div>
    );
}
