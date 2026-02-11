type AffixDef = {
    id: EnemyAffixId;
    label: string;
    description: string;
};

const AFFIX_IDS: EnemyAffixId[] = [
    "fortified",
    "frenzied",
    "swift",
    "bulwark",
    "thorned",
    "vampiric",
];

export const AFFIX_DEFS: Record<EnemyAffixId, AffixDef> = {
    fortified: {
        id: "fortified",
        label: "Fortified",
        description: "+20% HP and +3 armor",
    },
    frenzied: {
        id: "frenzied",
        label: "Frenzied",
        description: "+18% damage and -10% HP",
    },
    swift: {
        id: "swift",
        label: "Swift",
        description: "Q/W/E/R cooldown -1",
    },
    bulwark: {
        id: "bulwark",
        label: "Bulwark",
        description: "+6 armor and +6 tenacity",
    },
    thorned: {
        id: "thorned",
        label: "Thorned",
        description: "Reflects 15% physical damage taken",
    },
    vampiric: {
        id: "vampiric",
        label: "Vampiric",
        description: "Heals 20% of damage dealt",
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

function pickUnique<T>(items: T[], count: number, rng: () => number): T[] {
    const pool = [...items];
    const picks: T[] = [];

    while (pool.length > 0 && picks.length < count) {
        const index = Math.floor(rng() * pool.length);
        const [picked] = pool.splice(index, 1);
        if (picked !== undefined) picks.push(picked);
    }

    return picks;
}

export function rollEnemyAffixes(args: { nodeKind: MapNodeKind; seed: number }): EnemyAffixId[] {
    const { nodeKind, seed } = args;
    const rng = createRng(seed);

    if (nodeKind === "boss") {
        return pickUnique(AFFIX_IDS, 2, rng);
    }

    if (nodeKind === "elite") {
        return pickUnique(AFFIX_IDS, 1, rng);
    }

    if (nodeKind === "combat") {
        if (rng() <= 0.35) {
            return pickUnique(AFFIX_IDS, 1, rng);
        }
    }

    return [];
}

function cloneSkills(skills: Skills): Skills {
    return {
        Attack: { ...skills.Attack },
        Q: { ...skills.Q },
        W: { ...skills.W },
        E: { ...skills.E },
        R: { ...skills.R },
    };
}

export function applyAffixesOnSpawn(unit: champion, affixes: EnemyAffixId[]): champion {
    let next: champion = {
        ...unit,
        skills: cloneSkills(unit.skills),
        affixes: [...affixes],
    };

    for (const affix of affixes) {
        if (affix === "fortified") {
            const nextMaxHealth = Math.max(1, Math.round(next.maxHealth * 1.2));
            next = {
                ...next,
                maxHealth: nextMaxHealth,
                currentHealth: nextMaxHealth,
                baseArmor: next.baseArmor + 3,
                armor: next.armor + 3,
            };
        }

        if (affix === "frenzied") {
            const boosted = Object.fromEntries(
                (Object.keys(next.skills) as SkillKey[]).map((key) => {
                    const skill = next.skills[key];
                    return [
                        key,
                        {
                            ...skill,
                            physicalDamage: skill.physicalDamage
                                ? Math.max(1, Math.round(skill.physicalDamage * 1.18))
                                : undefined,
                            trueDamage: skill.trueDamage
                                ? Math.max(1, Math.round(skill.trueDamage * 1.18))
                                : undefined,
                        } satisfies Skill,
                    ];
                })
            ) as Skills;

            const nextMaxHealth = Math.max(1, Math.round(next.maxHealth * 0.9));
            next = {
                ...next,
                maxHealth: nextMaxHealth,
                currentHealth: Math.min(next.currentHealth, nextMaxHealth),
                skills: boosted,
            };
        }

        if (affix === "swift") {
            const q = next.skills.Q;
            const w = next.skills.W;
            const e = next.skills.E;
            const r = next.skills.R;
            next = {
                ...next,
                skills: {
                    ...next.skills,
                    Q: { ...q, cooldown: Math.max(0, q.cooldown - 1) },
                    W: { ...w, cooldown: Math.max(0, w.cooldown - 1) },
                    E: { ...e, cooldown: Math.max(0, e.cooldown - 1) },
                    R: { ...r, cooldown: Math.max(0, r.cooldown - 1) },
                },
            };
        }

        if (affix === "bulwark") {
            next = {
                ...next,
                baseArmor: next.baseArmor + 6,
                armor: next.armor + 6,
                baseTenacity: next.baseTenacity + 6,
                tenacity: next.tenacity + 6,
            };
        }
    }

    return next;
}

export function getAffixPostHitEffects(args: {
    attackerAffixes: EnemyAffixId[];
    defenderAffixes: EnemyAffixId[];
    physicalDamageDealt: number;
    totalDamageDealt: number;
}): { reflectDamage: number; lifestealHeal: number } {
    const { attackerAffixes, defenderAffixes, physicalDamageDealt, totalDamageDealt } = args;

    const reflectDamage = defenderAffixes.includes("thorned")
        ? Math.max(0, Math.round(physicalDamageDealt * 0.15))
        : 0;
    const lifestealHeal = attackerAffixes.includes("vampiric")
        ? Math.max(0, Math.round(totalDamageDealt * 0.2))
        : 0;

    return { reflectDamage, lifestealHeal };
}
