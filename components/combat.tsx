'use client'
import ChampionUi from "./UI/championUi";
import { championsData } from '@/lib/championData';
import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ChampionModel } from "./championModel";


export default function Combat(
    { player, setPlayer, enemy, setEnemy }:
        {
            player: champion,
            setPlayer: React.Dispatch<React.SetStateAction<champion>>,
            enemy: champion,
            setEnemy: React.Dispatch<React.SetStateAction<champion>>;
        }
) {
    /* Current animation SET */
    const [playerAnim, setPlayerAnim] = useState<string[]>(championsData[player.name.toLowerCase()].animations.idle);
    const [enemyAnim, setEnemyAnim] = useState<string[]>(championsData[enemy.name.toLowerCase()].animations.idle);

    /* Data of champions */
    const playerData = championsData[player.name.toLowerCase()];
    const enemyData = championsData[enemy.name.toLowerCase()];

    return (

        <div className="w-full h-[95vh] border">
            {/* Threejs Scene */}
            <Canvas camera={{ position: [0, 1.5, 4], fov: 70 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[2, 2, 2]} />
                <Suspense fallback={null}>
                    {/* Player */}
                    <ChampionModel
                        data={playerData}
                        position={[-1, -1, 2]}
                        rotation={[0, 15, 0]}
                        animationsActive={playerAnim}
                        setAnimations={setPlayerAnim}
                    />
                    {/* Enemy */}
                    <ChampionModel
                        data={enemyData}
                        position={[3, -1, -1]}
                        rotation={[0, -1, 0]}
                        animationsActive={enemyAnim}
                        setAnimations={setEnemyAnim}
                    />
                </Suspense>
            </Canvas>
            {/* Battle UI */}
            {/* Player */}
            <div className="absolute left-5 bottom-[20%]">
                <ChampionUi
                    champion={player}
                    setChampion={setPlayer}
                    championData={playerData}
                    setAnimations={setPlayerAnim}
                    isPlayer={true}
                />
            </div>
            {/* Enemy */}
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
    )
}