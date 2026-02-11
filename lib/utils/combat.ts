import { SKILL_KEYS } from "@/lib/champions";

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

export function resolveSkillCast(attacker: champion, defender: champion, skillKey: SkillKey) {
    const skill = attacker.skills[skillKey];

    let nextAttacker = { ...attacker };
    let nextDefender = { ...defender };

    const physicalDamage = Math.max((skill.physicalDamage ?? 0) - nextDefender.armor, 0);
    const trueDamage = skill.trueDamage ?? 0;
    const totalDamage = physicalDamage + trueDamage;

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

    return { attacker: nextAttacker, defender: nextDefender, skill };
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
