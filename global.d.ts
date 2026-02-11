/* System */
type turn = {
    number: number;
    playerTurn: boolean;
};

type CombatStatus = "active" | "playerWon" | "playerLost";
type ChampionId = "garen" | "darius";
type SkillKey = "Attack" | "Q" | "W" | "E" | "R";
type SkillUpgradeKey = Exclude<SkillKey, "Attack">;
type SkillCooldowns = Record<SkillKey, number>;

/* Map Info */
type mapCords = {
    x: number;
    y: number;
};

type mapRowProps = {
    playerCords: mapCords;
    setPlayerCords: React.Dispatch<React.SetStateAction<mapCords>>;
    rowY: number;
};

type mapNodeProps = {
    playerCords: mapCords;
    setPlayerCords: React.Dispatch<React.SetStateAction<mapCords>>;
    x: number;
    y: number;
};

/* Combat Info */
type champion = {
    name: string;
    maxHealth: number;
    currentHealth: number;
    maxMana?: number;
    currentMana?: number;
    armor: number;
    baseArmor: number;
    debuffs: Debuff[];
    buffs: Buff[];
    tenacity: number;
    baseTenacity: number;
    skills: Skills;
    upgradedSkills: Partial<Record<SkillUpgradeKey, number>>;
    stunned: boolean;
};

type Debuff = {
    type: "armorCrack" | "tenacityCrack" | "stun" | "custom";
    value: number;
    duration: number;
    remaining: number;
};

type Buff = {
    type: "armorBoost" | "tenacityBoost" | "stun" | "custom";
    value: number;
    duration: number;
    remaining: number;
};

type Skill = {
    type: "attack" | "defense" | "debuff" | "buff";
    time: number;
    cooldown: number;

    physicalDamage?: number;
    trueDamage?: number;
    heal?: number;
    debuff?: number;

    armorBoost?: number;
    tenacityBoost?: number;

    armorCrack?: number;
    tenacityCrack?: number;
};

type Skills = Record<SkillKey, Skill>;

/* 3D Info */
type CombatProps = {
    player: champion;
    setPlayer: React.Dispatch<React.SetStateAction<champion>>;
    enemy: champion;
    setEnemy: React.Dispatch<React.SetStateAction<champion>>;
    onPlayerWin?: (player: champion, enemy: champion) => void;
    onPlayerLose?: (player: champion, enemy: champion) => void;
};

type ChampionUiProps = {
    champion: champion;
    enemy: champion;
    isPlayer: boolean;
    championModelData: ChampionModelData;
    setAnimations: React.Dispatch<React.SetStateAction<AnimationStep[]>>;
    turn: turn;
    cooldowns: SkillCooldowns;
    isResolvingAction: boolean;
    combatStatus: CombatStatus;
    onSkillSelect?: (skillKey: SkillKey) => void;
};

type MainUiProps = {
    turn: turn;
    player: champion;
    enemy: champion;
    playerModelData: ChampionModelData;
    enemyModelData: ChampionModelData;
    setPlayerModelAnim: React.Dispatch<React.SetStateAction<AnimationStep[]>>;
    setEnemyModelAnim: React.Dispatch<React.SetStateAction<AnimationStep[]>>;
    playerCooldowns: SkillCooldowns;
    enemyCooldowns: SkillCooldowns;
    isResolvingAction: boolean;
    combatStatus: CombatStatus;
    onPlayerSkillSelect: (skillKey: SkillKey) => void;
};

type ChampionModelProps = {
    data: ChampionModelData;
    position: [number, number, number];
    rotation: [number, number, number];
    animationsActive: AnimationStep[];
    setAnimations: React.Dispatch<React.SetStateAction<AnimationStep[]>>;
};

/* Animation types */
type AnimationStep = {
    name: string;
    skillName: keyof ChampionAnimations;
    moveTo?: { x?: number; y?: number; z?: number; duration: number };
    rotateTo?: { x?: number; y?: number; z?: number; duration: number };
    sfx?: { audios?: string[] };
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
