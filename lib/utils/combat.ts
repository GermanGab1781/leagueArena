import { SKILL_KEYS } from "@/lib/champions";
import { getAffixPostHitEffects } from "@/lib/utils/affixes";
import { getRelicDamageBonus } from "@/lib/utils/relics";

export type ResolveSkillCastContext = {
    attackerRelics?: RelicId[];
    isAttackerFirstActionOfCombat?: boolean;
    attackerAffixes?: EnemyAffixId[];
    defenderAffixes?: EnemyAffixId[];
};

export type ResolveSkillCastResult = {
    attacker: champion;
    defender: champion;
    skill: Skill;
    totalDamageDealt: number;
    physicalDamageDealt: number;
    trueDamageDealt: number;
    consumedFirstActionBonus: boolean;
};

export function resetStats(champ: champion): champion {
    return {
        ...champ,
        armor: champ.baseArmor,
        tenacity: champ.baseTenacity,
        stunned: false,
    };
}

export function processDebuffs(champ: champion): champion {
    const updated = { ...champ };
    const remainingDebuffs: Debuff[] = [];

    for (const d of updated.debuffs) {
        switch (d.type) {
            case "armorCrack":
                updated.armor = Math.max(0, updated.armor - d.value);
                break;
            case "tenacityCrack":
                updated.tenacity = Math.max(0, updated.tenacity - d.value);
                break;
            case "stun":
                updated.stunned = true;
                break;
        }
        if (d.remaining > 1) {
            remainingDebuffs.push({ ...d, remaining: d.remaining - 1 });
        }

    }

    updated.debuffs = remainingDebuffs;
    return updated;
}

export function applyDebuffs(unit: champion, skill: Skill): champion {
    const newDebuffs = [...unit.debuffs];

    if (skill.debuff) {
        newDebuffs.push({ type: "custom", value: skill.debuff, duration: 5, remaining: 5 });
    }
    if (skill.armorCrack) {
        newDebuffs.push({ type: "armorCrack", value: skill.armorCrack, duration: 5, remaining: 5 });
    }
    if (skill.tenacityCrack) {
        newDebuffs.push({ type: "tenacityCrack", value: skill.tenacityCrack, duration: 4, remaining: 4 });
    }

    return { ...unit, debuffs: newDebuffs };
}
export function processBuffs(champ: champion): champion {
    const updated = { ...champ };
    const remainingBuffs: Buff[] = [];

    for (const d of updated.buffs) {
        switch (d.type) {
            case "armorBoost":
                updated.armor = Math.max(0, updated.armor + d.value);
                break;
            case "tenacityBoost":
                updated.tenacity = Math.max(0, updated.tenacity + d.value);
                break;
            case "stun":
                updated.stunned = true;
                break;
        }
        if (d.remaining > 1) {
            remainingBuffs.push({ ...d, remaining: d.remaining - 1 });
        }

    }

    updated.buffs = remainingBuffs;
    return updated;
}

export function applyBuffs(unit: champion, skill: Skill): champion {
    const newBuffs = [...unit.buffs];

    if (skill.armorBoost) {
        newBuffs.push({ type: "armorBoost", value: skill.armorBoost, duration: 5, remaining: 5 });
    }
    if (skill.tenacityBoost) {
        newBuffs.push({ type: "tenacityBoost", value: skill.tenacityBoost, duration: 4, remaining: 4 });
    }

    return { ...unit, buffs: newBuffs };
}

export function processTurnStart(unit: champion): champion {
    let updated = resetStats(unit);
    updated = processDebuffs(updated);
    updated = processBuffs(updated);
    return updated;
}

export function tickCooldowns(cooldowns: SkillCooldowns, usedSkill: SkillKey, usedCooldown: number): SkillCooldowns {
    const updated = { ...cooldowns };
    for (const key of SKILL_KEYS) {
        updated[key] = Math.max(0, updated[key] - 1);
    }
    updated[usedSkill] = usedCooldown;
    return updated;
}

export function resolveSkillCast(
    attacker: champion,
    defender: champion,
    skillKey: SkillKey,
    context: ResolveSkillCastContext = {}
): ResolveSkillCastResult {
    const skill = attacker.skills[skillKey];

    let nextAttacker = { ...attacker };
    let nextDefender = { ...defender };

    const relicDamageBonus = getRelicDamageBonus({
        relics: context.attackerRelics ?? [],
        skillKey,
        isFirstActionOfCombat: context.isAttackerFirstActionOfCombat ?? false,
        defender: nextDefender,
    });

    const rawPhysicalDamage = (skill.physicalDamage ?? 0) + relicDamageBonus.bonusPhysical;
    const physicalDamage = Math.max(rawPhysicalDamage - nextDefender.armor, 0);
    const trueDamage = Math.max(0, (skill.trueDamage ?? 0) + relicDamageBonus.bonusTrue);
    const totalDamage = physicalDamage + trueDamage;
    const defenderHealthBeforeHit = nextDefender.currentHealth;

    if (totalDamage > 0) {
        nextDefender = {
            ...nextDefender,
            currentHealth: Math.max(nextDefender.currentHealth - totalDamage, 0),
        };
    }

    if (skill.heal) {
        nextAttacker = {
            ...nextAttacker,
            currentHealth: Math.min(nextAttacker.currentHealth + skill.heal, nextAttacker.maxHealth),
        };
    }

    if (skill.armorBoost || skill.tenacityBoost) {
        nextAttacker = applyBuffs(nextAttacker, skill);
    }

    if (skill.debuff || skill.armorCrack || skill.tenacityCrack) {
        nextDefender = applyDebuffs(nextDefender, skill);
    }

    const attackerName = attacker.name.toLowerCase();

    // Champion-specific effects keep each kit unique without hardcoding logic in UI/components.
    if (attackerName === "garen" && skillKey === "W") {
        const bonusHeal = Math.round(nextAttacker.maxHealth * 0.08);
        nextAttacker = {
            ...nextAttacker,
            currentHealth: Math.min(nextAttacker.currentHealth + bonusHeal, nextAttacker.maxHealth),
        };
    }

    if (attackerName === "garen" && skillKey === "R") {
        const executeThreshold = Math.floor(nextDefender.maxHealth * 0.3);
        if (nextDefender.currentHealth <= executeThreshold) {
            nextDefender = {
                ...nextDefender,
                currentHealth: 0,
            };
        }
    }

    if (attackerName === "xin zhao" && skillKey === "Q") {
        // Q: Three Talon Strike — stuns the enemy for 1 turn
        nextDefender = {
            ...nextDefender,
            debuffs: [...nextDefender.debuffs, { type: "stun", value: 0, duration: 1, remaining: 1 }],
        };
    }

    if (attackerName === "xin zhao" && skillKey === "R") {
        // R: Crescent Guard — bonus true damage per tenacityCrack stack on enemy
        const tenCrackStacks = nextDefender.debuffs.filter((d) => d.type === "tenacityCrack").length;
        const bonusTrueDamage = tenCrackStacks * 8;
        if (bonusTrueDamage > 0) {
            nextDefender = {
                ...nextDefender,
                currentHealth: Math.max(nextDefender.currentHealth - bonusTrueDamage, 0),
            };
        }
    }

    if (attackerName === "darius" && skillKey === "Q") {
        const missingHealth = Math.max(0, nextAttacker.maxHealth - nextAttacker.currentHealth);
        const bonusHeal = Math.round(missingHealth * 0.12);
        nextAttacker = {
            ...nextAttacker,
            currentHealth: Math.min(nextAttacker.currentHealth + bonusHeal, nextAttacker.maxHealth),
        };
    }

    if (attackerName === "darius" && skillKey === "R") {
        const armorCrackStacks = nextDefender.debuffs.filter((debuff) => debuff.type === "armorCrack").length;
        const bonusTrueDamage = armorCrackStacks * 6;
        if (bonusTrueDamage > 0) {
            nextDefender = {
                ...nextDefender,
                currentHealth: Math.max(nextDefender.currentHealth - bonusTrueDamage, 0),
            };
        }
    }

    const totalDamageDealt = Math.max(0, defenderHealthBeforeHit - nextDefender.currentHealth);
    const physicalDamageDealt = Math.min(physicalDamage, totalDamageDealt);
    const trueDamageDealt = Math.max(0, totalDamageDealt - physicalDamageDealt);

    const postHitEffects = getAffixPostHitEffects({
        attackerAffixes: context.attackerAffixes ?? attacker.affixes,
        defenderAffixes: context.defenderAffixes ?? defender.affixes,
        physicalDamageDealt,
        totalDamageDealt,
    });

    if (postHitEffects.lifestealHeal > 0) {
        nextAttacker = {
            ...nextAttacker,
            currentHealth: Math.min(nextAttacker.maxHealth, nextAttacker.currentHealth + postHitEffects.lifestealHeal),
        };
    }

    if (postHitEffects.reflectDamage > 0) {
        nextAttacker = {
            ...nextAttacker,
            currentHealth: Math.max(0, nextAttacker.currentHealth - postHitEffects.reflectDamage),
        };
    }

    return {
        attacker: nextAttacker,
        defender: nextDefender,
        skill,
        totalDamageDealt,
        physicalDamageDealt,
        trueDamageDealt,
        consumedFirstActionBonus: relicDamageBonus.consumesFirstActionBonus,
    };
}

export function isDead(unit: champion): boolean {
    return unit.currentHealth <= 0;
}

export function prepareChampionForNextEncounter(unit: champion): champion {
    return {
        ...unit,
        currentHealth: Math.max(0, Math.min(unit.currentHealth, unit.maxHealth)),
        armor: unit.baseArmor,
        tenacity: unit.baseTenacity,
        stunned: false,
        buffs: [],
        debuffs: [],
    };
}
