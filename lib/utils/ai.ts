import { SKILL_KEYS } from "@/lib/champions";

type EnemyAiContext = {
    enemy: champion;
    player: champion;
    cooldowns: SkillCooldowns;
    turnNumber: number;
};

function estimateDamage(skill: Skill, target: champion): number {
    const physical = Math.max((skill.physicalDamage ?? 0) - target.armor, 0);
    const trueDamage = skill.trueDamage ?? 0;
    return physical + trueDamage;
}

function estimateChampionSkillDamage(
    championData: champion,
    skillKey: SkillKey,
    target: champion
): number {
    const base = estimateDamage(championData.skills[skillKey], target);
    const attackerName = championData.name.toLowerCase();

    if (attackerName === "garen" && skillKey === "R") {
        const executeThreshold = Math.floor(target.maxHealth * 0.3);
        if (target.currentHealth <= executeThreshold) return target.currentHealth;
    }

    if (attackerName === "darius" && skillKey === "R") {
        const armorCrackStacks = target.debuffs.filter((debuff) => debuff.type === "armorCrack").length;
        return base + armorCrackStacks * 6;
    }

    return base;
}

function getAvailableSkills(championData: champion, cooldowns: SkillCooldowns): SkillKey[] {
    return SKILL_KEYS.filter((key) => !!championData.skills[key] && cooldowns[key] <= 0);
}

function chooseHighestDamageSkill(enemy: champion, player: champion, availableSkills: SkillKey[]): SkillKey {
    let best: SkillKey = "Attack";
    let bestDamage = -1;

    for (const key of availableSkills) {
        const damage = estimateChampionSkillDamage(enemy, key, player);
        if (damage > bestDamage) {
            bestDamage = damage;
            best = key;
        }
    }

    return best;
}

function chooseForGaren(ctx: EnemyAiContext, availableSkills: SkillKey[]): SkillKey {
    const { enemy, player, turnNumber } = ctx;

    if (availableSkills.includes("R") && estimateChampionSkillDamage(enemy, "R", player) >= player.currentHealth) return "R";
    if (turnNumber <= 3 && availableSkills.includes("E") && player.armor > 0) return "E";
    if (availableSkills.includes("W") && enemy.currentHealth / enemy.maxHealth <= 0.35) return "W";
    if (availableSkills.includes("Q") && player.currentHealth / player.maxHealth <= 0.6) return "Q";
    if (availableSkills.includes("E") && player.armor > 0) return "E";
    return chooseHighestDamageSkill(enemy, player, availableSkills);
}

function chooseForDarius(ctx: EnemyAiContext, availableSkills: SkillKey[]): SkillKey {
    const { enemy, player, turnNumber } = ctx;

    if (availableSkills.includes("R") && estimateChampionSkillDamage(enemy, "R", player) >= player.currentHealth) return "R";
    if (turnNumber <= 2 && availableSkills.includes("E") && player.armor >= 6) return "E";
    if (availableSkills.includes("Q") && enemy.currentHealth / enemy.maxHealth <= 0.55) return "Q";
    if (availableSkills.includes("E") && player.armor >= 8) return "E";
    if (availableSkills.includes("W") && player.currentHealth / player.maxHealth <= 0.65) return "W";
    return chooseHighestDamageSkill(enemy, player, availableSkills);
}

function chooseForXinZhao(ctx: EnemyAiContext, availableSkills: SkillKey[]): SkillKey {
    const { enemy, player, turnNumber } = ctx;

    if (availableSkills.includes("R") && estimateChampionSkillDamage(enemy, "R", player) >= player.currentHealth) return "R";
    if (turnNumber <= 2 && availableSkills.includes("E")) return "E";
    if (availableSkills.includes("W") && player.currentHealth / player.maxHealth <= 0.7) return "W";
    if (availableSkills.includes("Q") && player.currentHealth / player.maxHealth <= 0.55) return "Q";
    if (availableSkills.includes("E") && player.tenacity >= 6) return "E";
    return chooseHighestDamageSkill(enemy, player, availableSkills);
}

export function chooseEnemySkill(ctx: EnemyAiContext): SkillKey {
    const availableSkills = getAvailableSkills(ctx.enemy, ctx.cooldowns);
    if (availableSkills.length === 0) return "Attack";

    const enemyName = ctx.enemy.name.toLowerCase();
    if (enemyName === "garen") return chooseForGaren(ctx, availableSkills);
    if (enemyName === "darius") return chooseForDarius(ctx, availableSkills);
    if (enemyName === "xin zhao") return chooseForXinZhao(ctx, availableSkills);

    return chooseHighestDamageSkill(ctx.enemy, ctx.player, availableSkills);
}
