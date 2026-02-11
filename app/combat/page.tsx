
'use client'
import { useState } from "react";
import { useGLTF } from '@react-three/drei';
import Combat from "@/components/Combat/combat";
import { createChampion } from "@/lib/champions";

useGLTF.preload('/models/Garen/Garen.glb');
useGLTF.preload('/models/Darius/Darius.glb');

export default function CombatPage() {
    const [fightKey, setFightKey] = useState(0);
    const [player, setPlayer] = useState<champion>(() => createChampion("garen"));
    const [enemy, setEnemy] = useState<champion>(() => createChampion("darius"));

    const resetFight = () => {
        setPlayer(createChampion("garen"));
        setEnemy(createChampion("darius"));
        setFightKey((prev) => prev + 1);
    };

    return (
        <div className="h-screen w-screen p-2">
            <button
                type="button"
                onClick={resetFight}
                className="border px-3 py-1 mb-2 bg-neutral-900 hover:bg-neutral-800"
            >
                Reset Duel
            </button>
            <Combat key={fightKey} player={player} setPlayer={setPlayer} enemy={enemy} setEnemy={setEnemy} />
        </div>
    )
}
