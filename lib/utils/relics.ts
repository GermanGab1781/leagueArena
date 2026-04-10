type RelicDef = {
    id: RelicId;
    label: string;
    description: string;
};

const RELIC_IDS: RelicId[] = [
    "giants_blood",
    "vanguard_plate",
    "steadfast_idol",
    "war_banner",
    "sharpening_stone",
    "runic_lens",
    "spirit_totem",
    "first_blood_sigil",
    "executioner_mark",
    "tome_of_pain",
    "twin_edge",
    "elixir_of_force",
];

export const RELIC_DEFS: Record<RelicId, RelicDef> = {
    executioner_mark: {
        id: "executioner_mark",
        label: "Executioner's Mark",
        description: "Skills vs enemies ≤40% HP deal +15 true damage",
    },
    tome_of_pain: {
        id: "tome_of_pain",
        label: "Tome of Pain",
        description: "Each armorCrack stack on enemy adds +2 true damage to skills",
    },
    twin_edge: {
        id: "twin_edge",
        label: "Twin Edge",
        description: "Q and W each deal +6 physical damage",
    },
    elixir_of_force: {
        id: "elixir_of_force",
        label: "Elixir of Force",
        description: "Attack and E each deal +7 physical damage",
    },
    giants_blood: {
        id: "giants_blood",
        label: "Giant's Blood",
        description: "+25 max HP and heal 25 now",
    },
    vanguard_plate: {
        id: "vanguard_plate",
        label: "Vanguard Plate",
        description: "+4 base armor",
    },
    steadfast_idol: {
        id: "steadfast_idol",
        label: "Steadfast Idol",
        description: "+4 base tenacity",
    },
    war_banner: {
        id: "war_banner",
        label: "War Banner",
        description: "Attack deals +5 physical damage",
    },
    sharpening_stone: {
        id: "sharpening_stone",
        label: "Sharpening Stone",
        description: "Q and E deal +4 physical damage",
    },
    runic_lens: {
        id: "runic_lens",
        label: "Runic Lens",
        description: "R cooldown -1",
    },
    spirit_totem: {
        id: "spirit_totem",
        label: "Spirit Totem",
        description: "W heal +12",
    },
    first_blood_sigil: {
        id: "first_blood_sigil",
        label: "First Blood Sigil",
        description: "First skill each combat deals +10 true damage",
    },
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

export function generateRelicOptions(seed: number, owned: RelicId[]): RelicId[] {
    const rng = createRng(seed);
    const unowned = RELIC_IDS.filter((id) => !owned.includes(id));
    const basePool = unowned.length >= 3 ? unowned : RELIC_IDS;
    const pool = [...basePool];
    const picks: RelicId[] = [];

    while (picks.length < 3 && pool.length > 0) {
        const index = Math.floor(rng() * pool.length);
        const [picked] = pool.splice(index, 1);
        if (picked) picks.push(picked);
    }

    return picks;
}

function applyPhysicalDamageDelta(unit: champion, skillKey: SkillKey, delta: number): champion {
    const skill = unit.skills[skillKey];
    if (!skill) return unit;
    const nextSkill: Skill = {
        ...skill,
        physicalDamage: (skill.physicalDamage ?? 0) + delta,
    };
    return {
        ...unit,
        skills: {
            ...unit.skills,
            [skillKey]: nextSkill,
        },
    };
}

export function applyRelicOnAcquire(unit: champion, relicId: RelicId): champion {
    if (relicId === "giants_blood") {
        const nextMaxHealth = unit.maxHealth + 25;
        return {
            ...unit,
            maxHealth: nextMaxHealth,
            currentHealth: Math.min(nextMaxHealth, unit.currentHealth + 25),
        };
    }

    if (relicId === "vanguard_plate") {
        return {
            ...unit,
            baseArmor: unit.baseArmor + 4,
            armor: unit.armor + 4,
        };
    }

    if (relicId === "steadfast_idol") {
        return {
            ...unit,
            baseTenacity: unit.baseTenacity + 4,
            tenacity: unit.tenacity + 4,
        };
    }

    if (relicId === "war_banner") {
        return applyPhysicalDamageDelta(unit, "Attack", 5);
    }

    if (relicId === "sharpening_stone") {
        const withQ = applyPhysicalDamageDelta(unit, "Q", 4);
        return applyPhysicalDamageDelta(withQ, "E", 4);
    }

    if (relicId === "twin_edge") {
        const withQ = applyPhysicalDamageDelta(unit, "Q", 6);
        return applyPhysicalDamageDelta(withQ, "W", 6);
    }

    if (relicId === "elixir_of_force") {
        const withAttack = applyPhysicalDamageDelta(unit, "Attack", 7);
        return applyPhysicalDamageDelta(withAttack, "E", 7);
    }

    if (relicId === "runic_lens") {
        const rSkill = unit.skills.R;
        const nextR: Skill = { ...rSkill, cooldown: Math.max(0, rSkill.cooldown - 1) };
        return {
            ...unit,
            skills: {
                ...unit.skills,
                R: nextR,
            },
        };
    }

    if (relicId === "spirit_totem") {
        const wSkill = unit.skills.W;
        const nextW: Skill = { ...wSkill, heal: (wSkill.heal ?? 0) + 12 };
        return {
            ...unit,
            skills: {
                ...unit.skills,
                W: nextW,
            },
        };
    }

    return unit;
}

export function getRelicDamageBonus(args: {
    relics: RelicId[];
    skillKey: SkillKey;
    isFirstActionOfCombat: boolean;
    defender?: { currentHealth: number; maxHealth: number; debuffs: { type: string }[] };
}): { bonusPhysical: number; bonusTrue: number; consumesFirstActionBonus: boolean } {
    const { relics, isFirstActionOfCombat, defender } = args;

    if (relics.includes("first_blood_sigil") && isFirstActionOfCombat) {
        return {
            bonusPhysical: 0,
            bonusTrue: 10,
            consumesFirstActionBonus: true,
        };
    }

    let bonusTrue = 0;
    const bonusPhysical = 0;

    if (defender && relics.includes("executioner_mark")) {
        if (defender.currentHealth / defender.maxHealth <= 0.4) {
            bonusTrue += 15;
        }
    }

    if (defender && relics.includes("tome_of_pain")) {
        const armorCrackStacks = defender.debuffs.filter((d) => d.type === "armorCrack").length;
        bonusTrue += armorCrackStacks * 2;
    }

    return { bonusPhysical, bonusTrue, consumesFirstActionBonus: false };
}
