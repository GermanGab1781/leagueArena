'use client'
import ChampionUi from "./UI/championUi";
import { championsData } from '@/lib/championData';
import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ChampionModel } from "./championModel";
import MainUi from "./UI/mainUi";


export default function Combat({ player, setPlayer, enemy, setEnemy }: CombatProps) {
    const playerKey = player.name.toLowerCase();
    const enemyKey = enemy.name.toLowerCase();

    const playerModelData: ChampionData = championsData[playerKey];
    const enemyModelData: ChampionData = championsData[enemyKey];

    // NOTE: animationsActive prop expects string[] (array of animation names), so map AnimationStep[] to string[] here
    const [playerModelAnim, setPlayerModelAnim] = useState<AnimationStep[]>(playerModelData.animations.idle);
    const [enemyModelAnim, setEnemyModelAnim] = useState<AnimationStep[]>(enemyModelData.animations.idle);

    const [turn, setTurn] = useState<turn>({ number: 1, playerTurn: true })

    return (
        <div className="w-full h-[95vh] border relative">
            {/* Three.js Scene */}
            <Canvas camera={{ position: [0, 1.5, 4], fov: 70 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[2, 2, 2]} />
                <Suspense fallback={null}>
                    {/* Player model */}
                    <ChampionModel
                        data={playerModelData}
                        position={[-1, -1, 2]}
                        rotation={[0, 140, 0]}
                        animationsActive={playerModelAnim}
                        setAnimations={setPlayerModelAnim}
                    />
                    {/* Enemy model */}
                    <ChampionModel
                        data={enemyModelData}
                        position={[3, -1, -1]}
                        rotation={[0, -50, 0]}
                        animationsActive={enemyModelAnim}
                        setAnimations={setEnemyModelAnim}
                    />
                </Suspense>
            </Canvas>

            {/* UI overlays */}
            <MainUi
                turn={turn} setTurn={setTurn}
                player={player} setPlayer={setPlayer} playerModelData={playerModelData} setPlayerModelAnim={setPlayerModelAnim}
                enemy={enemy} setEnemy={setEnemy} enemyModelData={enemyModelData} setEnemyModelAnim={setEnemyModelAnim}
            />
        </div>
    );
}