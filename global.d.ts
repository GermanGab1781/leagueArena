
/* combat info */
type champion = {
    name: string;
    maxHealth: number;
    currentHealth: number;
    armor: number;
    tenacity: number;
    skills: skills;
    stunned: boolean;
}

type skills = {
    Q: attack | defense | debuf;
    W: attack | defense | debuf;
    E: attack | defense | debuf;
    R: attack | defense | debuf;
}
type attack = {
    type: "attack";
    damage: number;
    heal?: number;
    debuff?: number;
    time: number;
}
type defense = {
    type: "defense";
    armorBoost?: number;
    heal?: number;
    tenacity?: number;
    time: number;
}
type debuff = {
    type: "debuff";
    armorCrack?: number;
    tenacityCrack?: number;
    time: number;
}

/* 3D info */
type CombatProps = {
    player: champion;
    setPlayer: React.Dispatch<React.SetStateAction<champion>>;
    enemy: champion;
    setEnemy: React.Dispatch<React.SetStateAction<champion>>;
};
type ChampionModelProps = {
  data: ChampionData;
  position: [number, number, number];
  rotation: [number, number, number];
  animationsActive: AnimationStep[];
  setAnimations: (animations: AnimationStep[]) => void;
};

/* Animation types */
type AnimationStep = {
    name: string;
    moveTo?: { x?: number; y?: number; z?: number; duration: number };
};

type ChampionAnimations = {
    idle: AnimationStep[];
    attack: AnimationStep[];
    death?: AnimationStep[];
    Q: AnimationStep[];
    W: AnimationStep[];
    E: AnimationStep[];
    R: AnimationStep[];
};

type ChampionData = {
    name: string;
    modelPath: string;
    animations: ChampionAnimations;
};