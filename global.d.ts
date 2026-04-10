/* System */
type turn = {
    number: number;
    playerTurn: boolean;
};

type CombatStatus = "active" | "playerWon" | "playerLost";
type ChampionId = "garen" | "darius" | "xinzhao";
type SkillKey = "Attack" | "Q" | "W" | "E" | "R";
type SkillUpgradeKey = Exclude<SkillKey, "Attack">;
type SkillCooldowns = Record<SkillKey, number>;
type MapNodeKind = "combat" | "elite" | "event" | "shop" | "rest" | "boss";
type RelicId =
    | "giants_blood"
    | "vanguard_plate"
    | "steadfast_idol"
    | "war_banner"
    | "sharpening_stone"
    | "runic_lens"
    | "spirit_totem"
    | "first_blood_sigil"
    | "executioner_mark"
    | "tome_of_pain"
    | "twin_edge"
    | "elixir_of_force";
type EnemyAffixId =
    | "fortified"
    | "frenzied"
    | "swift"
    | "bulwark"
    | "thorned"
    | "vampiric";

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
    affixes: EnemyAffixId[];
    level: number;
    xp: number;
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
    time: number;       // ms until damage lands + health bar updates (visual impact moment)
    returnDelay?: number; // ms AFTER time before the turn advances (walk-back animation)
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
    playerRelics?: RelicId[];
    enemyRelics?: RelicId[];
    goldReward?: number;
    xpReward?: number;
    nodeKind?: MapNodeKind;
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
    onSkillHover?: (skillKey: SkillKey | null) => void;
    previewSkillKey?: SkillKey | null;
    previewAttackerRelics?: RelicId[];
    previewAttackerFirstActionAvailable?: boolean;
    currentRelics?: RelicId[];
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
    playerRelics?: RelicId[];
    enemyRelics?: RelicId[];
    playerFirstActionAvailable?: boolean;
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
    moveTo?: { x?: number; y?: number; z?: number; duration: number };        // player-side coords
    rotateTo?: { x?: number; y?: number; z?: number; duration: number };      // player-side rotation
    enemyMoveTo?: { x?: number; y?: number; z?: number; duration: number };   // overrides moveTo when on enemy side
    enemyRotateTo?: { x?: number; y?: number; z?: number; duration: number }; // overrides rotateTo when on enemy side
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
