/* System */
type turn = {
    number: number;
    playerTurn: boolean;
}


/* combat info */
type champion = {
    name: string;
    maxHealth: number;
    currentHealth: number;
    maxMana?:number;
    currentMana?:number;
    armor: number;
    tenacity: number;
    skills: skills;
    stunned: boolean;
}

type Skill = {
    type: "attack" | "defense" | "debuff";
    time: number;
    cooldown:number;

    // Attack-related
    damage?: number;
    heal?: number;
    debuff?: number;

    // Defense-related
    armorBoost?: number;
    tenacity?: number;

    // Debuff-related
    armorCrack?: number;
    tenacityCrack?: number;
};

type Skills = {
    Attack:Skill;
    Q: Skill;
    W: Skill;
    E: Skill;
    R: Skill;
};


/* 3D info */
type CombatProps = {
    player: champion;
    setPlayer: React.Dispatch<React.SetStateAction<champion>>;
    enemy: champion;
    setEnemy: React.Dispatch<React.SetStateAction<champion>>;
};
type ChampionUiProps = {
    champion: champion,
    setChampion: React.Dispatch<React.SetStateAction<champion>>,
    enemy: champion,
    setEnemy: React.Dispatch<React.SetStateAction<champion>>,
    isPlayer: boolean,
    championModelData: ChampionData,
    setAnimations: React.Dispatch<React.SetStateAction<AnimationStep[]>>
    setTurn:React.Dispatch<React.SetStateAction<turn>>
    turn:turn;
}
type MainUiProps = {
    turn: turn;
    setTurn: React.Dispatch<React.SetStateAction<turn>>,
    player: champion;
    setPlayer: React.Dispatch<React.SetStateAction<champion>>;
    playerModelData: ChampionData;
    setPlayerModelAnim: SetStateAction<AnimationStep[]>;
    enemyModelData: ChampionData;
    setEnemyModelAnim: SetStateAction<AnimationStep[]>;
    enemy: champion;
    setEnemy: React.Dispatch<React.SetStateAction<champion>>;
}
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
    rotateTo?: { x?: number; y?: number; z?: number; duration: number };
};

type ChampionAnimations = {
    idle: AnimationStep[];
    Attack: AnimationStep[];
    death?: AnimationStep[];
    Q: AnimationStep[];
    W: AnimationStep[];
    E: AnimationStep[];
    R: AnimationStep[];
};

type ChampionModelData = {
    name: string;
    modelPath: string;
    animations: ChampionAnimations;
};