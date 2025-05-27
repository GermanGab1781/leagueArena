'use client'
import TestViewer from "@/components/testViewer";
import { useState } from "react";
import { useGLTF } from '@react-three/drei';
import Combat from "@/components/combat";

useGLTF.preload('/models/Garen/Garen.glb');
useGLTF.preload('/models/Darius/Darius.glb');

export default function Home() {

  /* Always put one more second for cooldown */
  const garen: champion = {
    name: "Garen",
    maxHealth: 100,
    currentHealth: 100,
    armor: 15,
    tenacity: 0,
    stunned: false,
    skills: {
      Attack: { type: "attack", damage: 10, time: 2000, cooldown: 3 },
      Q: { type: "attack", damage: 30, time: 5000, cooldown: 2 },
      W: { type: "defense", armorBoost: 20, time: 2000, cooldown: 4 },
      E: { type: "attack", damage: 25, time: 2000, cooldown: 3 },
      R: { type: "attack", damage: 50, time: 2000, cooldown: 6 }
    },
  }
  const darius: champion = {
    name: "Darius",
    maxHealth: 100,
    currentHealth: 100,
    armor: 5,
    tenacity: 0,
    stunned: false,
    skills: {
      Attack: { type: "attack", damage: 10, time: 2000, cooldown: 3 },
      Q: { type: "attack", damage: 15, heal: 5, time: 2000, cooldown: 3 },
      W: { type: "attack", tenacityCrack: 20, time: 2000, cooldown: 3 },
      E: { type: "attack", damage: 25, time: 2000, cooldown: 4 },
      R: { type: "attack", damage: 50, time: 2000, cooldown: 4 }
    },
  }

  const [player, setPlayer] = useState<champion>(garen)
  const [enemy, setEnemy] = useState<champion>(darius)
  return (
    <div className="m-auto">
      <div>
        <Combat player={player} setPlayer={setPlayer} enemy={enemy} setEnemy={setEnemy} />
      </div>
    </div>
  );
}
