export type UpgradeOption =
    | {
        id: string;
        kind: "stat";
        stat: "maxHealth" | "armor" | "tenacity";
        value: number;
        label: string;
        description: string;
    }
    | {
        id: string;
        kind: "skill";
        skill: SkillUpgradeKey;
        label: string;
        description: string;
    };

const createRng = (seed: number) => {
    let t = seed >>> 0;
    return () => {
        t += 0x6D2B79F5;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
};

const pickOne = <T,>(items: T[], rng: () => number): T => {
    return items[Math.floor(rng() * items.length)];
};

export function generateUpgradeOptions(seed: number): UpgradeOption[] {
    const rng = createRng(seed);

    const statOptions: UpgradeOption[] = [
        {
            id: "stat-maxHealth",
            kind: "stat",
            stat: "maxHealth",
            value: 35,
            label: "Juggernaut Core",
            description: "+35 Max Health and +35 current Health",
        },
        {
            id: "stat-armor",
            kind: "stat",
            stat: "armor",
            value: 4,
            label: "Steel Plating",
            description: "+4 Armor (base and current)",
        },
        {
            id: "stat-tenacity",
            kind: "stat",
            stat: "tenacity",
            value: 4,
            label: "Iron Will",
            description: "+4 Tenacity (base and current)",
        },
    ];

    const skillOptions: UpgradeOption[] = [
        {
            id: "skill-Q",
            kind: "skill",
            skill: "Q",
            label: "Q Upgrade",
            description: "Q deals more damage and applies armor crack",
        },
        {
            id: "skill-W",
            kind: "skill",
            skill: "W",
            label: "W Upgrade",
            description: "W adds healing and stronger defensive buffs",
        },
        {
            id: "skill-E",
            kind: "skill",
            skill: "E",
            label: "E Upgrade",
            description: "E deals more damage and applies tenacity crack",
        },
        {
            id: "skill-R",
            kind: "skill",
            skill: "R",
            label: "R Upgrade",
            description: "R gains bonus damage and reduced cooldown",
        },
    ];

    const first = pickOne(statOptions, rng);
    const second = pickOne(skillOptions, rng);

    const taken = new Set<string>([first.id, second.id]);
    const combinedPool = [...statOptions, ...skillOptions].filter((option) => !taken.has(option.id));
    const third = pickOne(combinedPool, rng);

    return [first, second, third];
}

function applyStatUpgrade(unit: champion, option: Extract<UpgradeOption, { kind: "stat" }>): champion {
    if (option.stat === "maxHealth") {
        const nextMaxHealth = unit.maxHealth + option.value;
        return {
            ...unit,
            maxHealth: nextMaxHealth,
            currentHealth: Math.min(nextMaxHealth, unit.currentHealth + option.value),
        };
    }

    if (option.stat === "armor") {
        return {
            ...unit,
            baseArmor: unit.baseArmor + option.value,
            armor: unit.armor + option.value,
        };
    }

    return {
        ...unit,
        baseTenacity: unit.baseTenacity + option.value,
        tenacity: unit.tenacity + option.value,
    };
}

function applySkillUpgrade(unit: champion, option: Extract<UpgradeOption, { kind: "skill" }>): champion {
    const key = option.skill;
    const baseSkill = unit.skills[key];
    const nextSkill: Skill = { ...baseSkill };

    if (key === "Q") {
        nextSkill.physicalDamage = (nextSkill.physicalDamage ?? 0) + 8;
        nextSkill.armorCrack = (nextSkill.armorCrack ?? 0) + 2;
    }

    if (key === "W") {
        nextSkill.heal = (nextSkill.heal ?? 0) + 16;
        nextSkill.armorBoost = (nextSkill.armorBoost ?? 0) + 3;
        nextSkill.tenacityBoost = (nextSkill.tenacityBoost ?? 0) + 3;
    }

    if (key === "E") {
        nextSkill.physicalDamage = (nextSkill.physicalDamage ?? 0) + 6;
        nextSkill.tenacityCrack = (nextSkill.tenacityCrack ?? 0) + 2;
    }

    if (key === "R") {
        nextSkill.trueDamage = (nextSkill.trueDamage ?? 0) + 14;
        nextSkill.physicalDamage = (nextSkill.physicalDamage ?? 0) + 8;
        nextSkill.cooldown = Math.max(0, nextSkill.cooldown - 1);
    }

    return {
        ...unit,
        skills: {
            ...unit.skills,
            [key]: nextSkill,
        },
        upgradedSkills: {
            ...unit.upgradedSkills,
            [key]: (unit.upgradedSkills[key] ?? 0) + 1,
        },
    };
}

export function applyUpgradeOption(unit: champion, option: UpgradeOption): champion {
    if (option.kind === "stat") return applyStatUpgrade(unit, option);
    return applySkillUpgrade(unit, option);
}

