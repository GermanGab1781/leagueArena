export const SKILL_KEYS: SkillKey[] = ["Attack", "Q", "W", "E", "R"];

export const EMPTY_COOLDOWNS: SkillCooldowns = {
    Attack: 0,
    Q: 0,
    W: 0,
    E: 0,
    R: 0,
};

const championTemplates: Record<ChampionId, champion> = {
    garen: {
        name: "Garen",
        maxHealth: 100,
        currentHealth: 100,
        armor: 10,
        baseArmor: 10,
        baseTenacity: 25,
        tenacity: 25,
        buffs: [],
        debuffs: [],
        upgradedSkills: {},
        stunned: false,
        level: 1,
        xp: 0,
        skills: {
            Attack: { type: "attack", physicalDamage: 10, time: 700, cooldown: 0 },
            Q: { type: "attack", physicalDamage: 30, time: 2800, returnDelay: 1100, cooldown: 2 },
            W: { type: "buff", armorBoost: 5, tenacityBoost: 2, time: 2000, cooldown: 4 },
            E: { type: "attack", physicalDamage: 25, armorCrack: 1, time: 2800, returnDelay: 1600, cooldown: 1 },
            R: { type: "attack", trueDamage: 50, time: 2000, cooldown: 6 },
        },
        affixes: [],
    },
    xinzhao: {
        name: "Xin Zhao",
        maxHealth: 90,
        currentHealth: 90,
        armor: 7,
        baseArmor: 7,
        baseTenacity: 22,
        tenacity: 22,
        buffs: [],
        debuffs: [],
        upgradedSkills: {},
        stunned: false,
        level: 1,
        xp: 0,
        skills: {
            Attack: { type: "attack", physicalDamage: 10, time: 800, cooldown: 0 },
            Q: { type: "attack", physicalDamage: 22, time: 2000, returnDelay: 1200, cooldown: 3 },
            W: { type: "attack", physicalDamage: 30, time: 2200, returnDelay: 1200, cooldown: 4 },
            E: { type: "attack", physicalDamage: 12, tenacityCrack: 4, time: 1500, returnDelay: 1400, cooldown: 2 },
            R: { type: "attack", trueDamage: 40, armorBoost: 5, time: 2500, cooldown: 6 },
        },
        affixes: [],
    },
    darius: {
        name: "Darius",
        maxHealth: 100,
        currentHealth: 100,
        armor: 4,
        baseArmor: 4,
        baseTenacity: 25,
        tenacity: 25,
        buffs: [],
        debuffs: [],
        upgradedSkills: {},
        stunned: false,
        level: 1,
        xp: 0,
        skills: {
            Attack: { type: "attack", physicalDamage: 9, time: 1200, cooldown: 0 },
            Q: { type: "attack", physicalDamage: 14, heal: 6, time: 2000, returnDelay: 1800, cooldown: 3 },
            W: { type: "attack", physicalDamage: 19, time: 1800, returnDelay: 2000, cooldown: 4 },
            E: { type: "attack", physicalDamage: 8, armorCrack: 6, tenacityCrack: 1, time: 1200, cooldown: 2 },
            R: { type: "attack", physicalDamage: 34, trueDamage: 8, time: 2000, cooldown: 5 },
        },
        affixes: [],
    },
};

function cloneSkills(skills: Skills): Skills {
    return {
        Attack: { ...skills.Attack },
        Q: { ...skills.Q },
        W: { ...skills.W },
        E: { ...skills.E },
        R: { ...skills.R },
    };
}

export function createChampion(id: ChampionId): champion {
    const template = championTemplates[id];

    return {
        ...template,
        currentHealth: template.maxHealth,
        armor: template.baseArmor,
        tenacity: template.baseTenacity,
        buffs: [],
        debuffs: [],
        upgradedSkills: {},
        stunned: false,
        level: 1,
        xp: 0,
        skills: cloneSkills(template.skills),
        affixes: [],
    };
}

export function scaleChampion(base: champion, scale: number): champion {
    const scaledHealth = Math.max(1, Math.round(base.maxHealth * scale));
    const scaledArmor = Math.max(0, Math.round(base.baseArmor * Math.max(scale * 0.8, 0.5)));
    const scaledTenacity = Math.max(0, Math.round(base.baseTenacity * Math.max(scale * 0.8, 0.5)));

    const scaledSkills = Object.fromEntries(
        SKILL_KEYS.map((key) => {
            const skill = base.skills[key];
            return [
                key,
                {
                    ...skill,
                    physicalDamage: skill.physicalDamage ? Math.max(1, Math.round(skill.physicalDamage * scale)) : undefined,
                    trueDamage: skill.trueDamage ? Math.max(1, Math.round(skill.trueDamage * scale)) : undefined,
                    heal: skill.heal ? Math.max(1, Math.round(skill.heal * Math.max(scale * 0.8, 0.6))) : undefined,
                    armorBoost: skill.armorBoost ? Math.max(1, Math.round(skill.armorBoost * Math.max(scale * 0.8, 0.6))) : undefined,
                    tenacityBoost: skill.tenacityBoost ? Math.max(1, Math.round(skill.tenacityBoost * Math.max(scale * 0.8, 0.6))) : undefined,
                    armorCrack: skill.armorCrack ? Math.max(1, Math.round(skill.armorCrack * Math.max(scale * 0.7, 0.5))) : undefined,
                    tenacityCrack: skill.tenacityCrack ? Math.max(1, Math.round(skill.tenacityCrack * Math.max(scale * 0.7, 0.5))) : undefined,
                } satisfies Skill,
            ];
        })
    ) as Skills;

    return {
        ...base,
        maxHealth: scaledHealth,
        currentHealth: scaledHealth,
        baseArmor: scaledArmor,
        armor: scaledArmor,
        baseTenacity: scaledTenacity,
        tenacity: scaledTenacity,
        buffs: [],
        debuffs: [],
        upgradedSkills: { ...base.upgradedSkills },
        stunned: false,
        skills: scaledSkills,
        affixes: [...base.affixes],
    };
}
