export function processDebuffs(champ: champion): champion {
    let updated = { ...champ };
    // Reset stats
    updated.armor = updated.baseArmor;
    updated.tenacity = updated.baseTenacity;
    updated.stunned = false;

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
