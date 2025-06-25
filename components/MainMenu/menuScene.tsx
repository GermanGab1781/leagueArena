import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import { ChampionModel } from "../championModel";
import { championsData } from "@/lib/championData";


export default function MenuScene() {
    const garenModelData: ChampionModelData = championsData["garen"];
    const [garenModelAnim, setGarenModelAnim] = useState<AnimationStep[]>(garenModelData.animations.idle);
    return (
        <div className="h-screen">
            {/* Three.js Scene */}
            <Canvas camera={{ position: [0.4, 1.2, 3], fov: 90 }}>
                <ambientLight intensity={2} />
                <directionalLight position={[2, 2, 2]} />
                <Suspense fallback={null}>
                    {/* Garen model */}
                    <ChampionModel
                        data={garenModelData}
                        position={[0, -0.4, 1]}
                        rotation={[0, 0, 0]}
                        animationsActive={garenModelAnim}
                        setAnimations={setGarenModelAnim}
                    />
                </Suspense>
            </Canvas>




        </div>
    )
}