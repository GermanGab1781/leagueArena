
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
type ChampionModelProps = {
    data: ChampionData;
    position?: [number, number, number];
    rotation?: [number, number, number];
    animationsActive: string[];
    setAnimations: React.Dispatch<React.SetStateAction<string[]>>;
};
/* Animations data */
type ChampionAnimations = {
    idle: string[];
    attack: string[];
    death?: string[];
    Q: string[];
    W: string[];
    E: string[];
    R: string[];
};

type ChampionData = {
    name: string;
    modelPath: string;
    animations: ChampionAnimations;
};