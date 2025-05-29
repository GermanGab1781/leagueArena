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
    armor: 10,
    baseArmor:10,
    baseTenacity:25,
    tenacity: 25,
    debuffs: [],
    stunned: false,
    skills: {
      Attack: { type: "attack", physicalDamage: 10, time: 700, cooldown: 3 },
      Q: { type: "attack", physicalDamage: 30, time: 5000, cooldown: 2 },
      W: { type: "defense", armorBoost: 5, time: 2000, cooldown: 4 },
      E: { type: "attack", physicalDamage: 25,armorCrack:1, time: 200, cooldown: 0 },
      R: { type: "attack", trueDamage: 50, time: 2000, cooldown: 6 }
    },
  }
  const darius: champion = {
    name: "Darius",
    maxHealth: 100,
    currentHealth: 100,
    armor: 5,
    baseArmor:5,
    baseTenacity:25,
    tenacity: 25,
    debuffs: [],
    stunned: false,
    skills: {
      Attack: { type: "attack", physicalDamage: 10, time: 2000, cooldown: 0 },
      Q: { type: "attack", physicalDamage: 15, heal: 5, time: 2000, cooldown: 3 },
      W: { type: "attack", physicalDamage: 25, time: 2000, cooldown: 4 },
      E: { type: "attack", physicalDamage: 10, armorCrack:9,tenacityCrack: 1, time: 200, cooldown: 1 },
      R: { type: "attack", physicalDamage: 50, time: 2000, cooldown: 4 }
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
