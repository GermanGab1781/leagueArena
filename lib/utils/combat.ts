export function resetStats(champ: champion): champion {
    return {
        ...champ,
        armor: champ.baseArmor,
        tenacity: champ.baseTenacity,
        stunned: false,
    };
}

export function processDebuffs(champ: champion): champion {
    let updated = { ...champ };
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
    let updated = { ...champ };
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

    if (skill.debuff) {
        newBuffs.push({ type: "custom", value: skill.debuff, duration: 5, remaining: 5 });
    }
    if (skill.armorBoost) {
        newBuffs.push({ type: "armorBoost", value: skill.armorBoost, duration: 5, remaining: 5 });
    }
    if (skill.tenacityBoost) {
        newBuffs.push({ type: "tenacityBoost", value: skill.tenacityBoost, duration: 4, remaining: 4 });
    }

    return { ...unit, buffs: newBuffs };
}
