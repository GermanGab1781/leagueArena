'use client'
import ChampionUi from "./UI/championUi";
import { championsData } from '@/lib/championData';
import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ChampionModel } from "./championModel";


export default function Combat({ player, setPlayer, enemy, setEnemy }: CombatProps) {
    const playerKey = player.name.toLowerCase();
    const enemyKey = enemy.name.toLowerCase();

    const playerData: ChampionData = championsData[playerKey];
    const enemyData: ChampionData = championsData[enemyKey];

    // NOTE: animationsActive prop expects string[] (array of animation names), so map AnimationStep[] to string[] here
    const [playerAnim, setPlayerAnim] = useState<AnimationStep[]>(playerData.animations.idle);
    const [enemyAnim, setEnemyAnim] = useState<AnimationStep[]>(enemyData.animations.idle);


    return (
        <div className="w-full h-[95vh] border relative">
            {/* Three.js Scene */}
            <Canvas camera={{ position: [0, 1.5, 4], fov: 70 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[2, 2, 2]} />
                <Suspense fallback={null}>
                    {/* Player model */}
                    <ChampionModel
                        data={playerData}
                        position={[-1, -1, 2]}
                        rotation={[0, 140, 0]}
                        animationsActive={playerAnim}
                        setAnimations={setPlayerAnim}
                    />
                    {/* Enemy model */}
                    <ChampionModel
                        data={enemyData}
                        position={[3, -1, -1]}
                        rotation={[0, -50, 0]}
                        animationsActive={enemyAnim}
                        setAnimations={setEnemyAnim}
                    />
                </Suspense>
            </Canvas>

            {/* UI overlays */}
            <div className="absolute left-5 bottom-[20%]">
                <ChampionUi
                    champion={player}
                    setChampion={setPlayer}
                    championData={playerData}
                    setAnimations={setPlayerAnim}
                    isPlayer={true}
                />
            </div>

            <div className="absolute right-5 top-[20%]">
                <ChampionUi
                    champion={enemy}
                    setChampion={setEnemy}
                    championData={enemyData}
                    setAnimations={setEnemyAnim}
                    isPlayer={false}
                />
            </div>
        </div>
    );
}