'use client'
import TestViewer from "@/components/testViewer";
import { useState } from "react";
import { useGLTF } from '@react-three/drei';
import Combat from "@/components/combat";

useGLTF.preload('/models/Garen/Garen.glb');
useGLTF.preload('/models/Darius/Darius.glb');

export default function Home() {
  const garen: champion = {
    name: "Garen",
    maxHealth: 100,
    currentHealth: 100,
    armor: 100,
    tenacity: 0,
    stunned: false,
    skills: {
      Q: { type: "attack", damage: 30 },
      W: { type: "defense", armorBoost: 20 },
      E: { type: "attack", damage: 25 },
      R: { type: "attack", damage: 50 }
    },
  }
  const darius: champion = {
    name: "Darius",
    maxHealth: 100,
    currentHealth: 100,
    armor: 60,
    tenacity: 0,
    stunned: false,
    skills: {
      Q: { type: "attack", damage: 15, heal: 5 },
      W: { type: "attack", tenacityCrack: 20 },
      E: { type: "attack", damage: 25 },
      R: { type: "attack", damage: 50 }
    },
  }

  const [player, setPlayer] = useState<champion>(garen)
  const [enemy, setEnemy] = useState<champion>(darius)
  return (
    <div className="m-auto">
      <div>
        {/* <TestViewer/> */}
        <Combat player={player} setPlayer={setPlayer} enemy={enemy} setEnemy={setEnemy} />
      </div>
    </div>
  );
}
