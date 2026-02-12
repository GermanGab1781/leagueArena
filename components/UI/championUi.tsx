import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { SKILL_KEYS } from "@/lib/champions";
import { AFFIX_DEFS } from "@/lib/utils/affixes";
import { resolveSkillCast } from "@/lib/utils/combat";
import { getRelicDamageBonus, RELIC_DEFS } from "@/lib/utils/relics";

type StatBreakdown = {
    base: number;
    positiveLabel: string;
    positiveValue: number;
    negativeLabel: string;
    negativeValue: number;
    total: number;
};

type DamageFlashState = {
    left: number;
    width: number;
    visible: boolean;
    animateOut: boolean;
};

const DAMAGE_FLASH_DURATION_MS = 680;

const RELIC_ICON_META: Record<RelicId, { glyph: string; short: string }> = {
    giants_blood: { glyph: "GB", short: "Blood" },
    vanguard_plate: { glyph: "VP", short: "Plate" },
    steadfast_idol: { glyph: "SI", short: "Idol" },
    war_banner: { glyph: "WB", short: "Banner" },
    sharpening_stone: { glyph: "SS", short: "Stone" },
    runic_lens: { glyph: "RL", short: "Lens" },
    spirit_totem: { glyph: "ST", short: "Totem" },
    first_blood_sigil: { glyph: "FS", short: "Sigil" },
};

type SkillDamageEstimate = {
    basePhysicalDamage: number;
    finalPhysicalDamage: number;
    baseTrueDamage: number;
    bonusTrueDamage: number;
    totalDamage: number;
    isExecute: boolean;
    executeThreshold: number | null;
};

function estimateChampionSkillDamage(
    attacker: champion,
    defender: champion,
    skillKey: SkillKey,
    context: { attackerRelics: RelicId[]; isAttackerFirstActionOfCombat: boolean }
): SkillDamageEstimate {
    const skill = attacker.skills[skillKey];
    if (!skill) {
        return {
            basePhysicalDamage: 0,
            finalPhysicalDamage: 0,
            baseTrueDamage: 0,
            bonusTrueDamage: 0,
            totalDamage: 0,
            isExecute: false,
            executeThreshold: null,
        };
    }

    const basePhysicalDamage = skill.physicalDamage ?? 0;
    const relicDamageBonus = getRelicDamageBonus({
        relics: context.attackerRelics,
        skillKey,
        isFirstActionOfCombat: context.isAttackerFirstActionOfCombat,
    });
    const finalPhysicalDamage = Math.max(basePhysicalDamage + relicDamageBonus.bonusPhysical - defender.armor, 0);
    const baseTrueDamage = skill.trueDamage ?? 0;
    let bonusTrueDamage = relicDamageBonus.bonusTrue;
    let totalDamage = finalPhysicalDamage + baseTrueDamage + bonusTrueDamage;
    let isExecute = false;
    let executeThreshold: number | null = null;
    const attackerName = attacker.name.toLowerCase();

    if (attackerName === "garen" && skillKey === "R") {
        executeThreshold = Math.floor(defender.maxHealth * 0.3);
        const healthAfterBaseHit = Math.max(defender.currentHealth - totalDamage, 0);
        if (healthAfterBaseHit <= executeThreshold) {
            isExecute = true;
            totalDamage = defender.currentHealth;
        }
    }

    if (attackerName === "darius" && skillKey === "R") {
        const armorCrackStacks = defender.debuffs.filter((debuff) => debuff.type === "armorCrack").length;
        bonusTrueDamage += armorCrackStacks * 6;
        totalDamage = finalPhysicalDamage + baseTrueDamage + bonusTrueDamage;
    }

    const projected = resolveSkillCast(
        attacker,
        defender,
        skillKey,
        {
            attackerRelics: context.attackerRelics,
            isAttackerFirstActionOfCombat: context.isAttackerFirstActionOfCombat,
            attackerAffixes: attacker.affixes,
            defenderAffixes: defender.affixes,
        }
    );
    const projectedTotalDamage = Math.max(0, Math.min(projected.totalDamageDealt, defender.currentHealth));

    return {
        basePhysicalDamage,
        finalPhysicalDamage,
        baseTrueDamage,
        bonusTrueDamage,
        totalDamage: projectedTotalDamage,
        isExecute,
        executeThreshold,
    };
}

const debuffDetails: Record<Debuff["type"], { label: string; effect: (debuff: Debuff) => string }> = {
    armorCrack: {
        label: "Armor Crack",
        effect: (debuff) => `-${debuff.value} armor`,
    },
    tenacityCrack: {
        label: "Tenacity Crack",
        effect: (debuff) => `-${debuff.value} tenacity`,
    },
    stun: {
        label: "Stun",
        effect: () => "Skip next turn",
    },
    custom: {
        label: "Custom Debuff",
        effect: (debuff) => `Custom effect (${debuff.value})`,
    },
};

const buffDetails: Record<Buff["type"], { label: string; effect: (buff: Buff) => string }> = {
    armorBoost: {
        label: "Armor Boost",
        effect: (buff) => `+${buff.value} armor`,
    },
    tenacityBoost: {
        label: "Tenacity Boost",
        effect: (buff) => `+${buff.value} tenacity`,
    },
    stun: {
        label: "Stun",
        effect: () => "Skip next turn",
    },
    custom: {
        label: "Custom Buff",
        effect: (buff) => `Custom effect (${buff.value})`,
    },
};

function sumArmorBoost(champion: champion) {
    return champion.buffs
        .filter((buff) => buff.type === "armorBoost")
        .reduce((sum, buff) => sum + buff.value, 0);
}

function sumArmorCrack(champion: champion) {
    return champion.debuffs
        .filter((debuff) => debuff.type === "armorCrack")
        .reduce((sum, debuff) => sum + debuff.value, 0);
}

function sumTenacityBoost(champion: champion) {
    return champion.buffs
        .filter((buff) => buff.type === "tenacityBoost")
        .reduce((sum, buff) => sum + buff.value, 0);
}

function sumTenacityCrack(champion: champion) {
    return champion.debuffs
        .filter((debuff) => debuff.type === "tenacityCrack")
        .reduce((sum, debuff) => sum + debuff.value, 0);
}

function getArmorBreakdown(champion: champion): StatBreakdown {
    const positive = sumArmorBoost(champion);
    const negative = sumArmorCrack(champion);

    return {
        base: champion.baseArmor,
        positiveLabel: "W / armor buffs",
        positiveValue: positive,
        negativeLabel: "Armor crack",
        negativeValue: negative,
        total: champion.armor,
    };
}

function getTenacityBreakdown(champion: champion): StatBreakdown {
    const positive = sumTenacityBoost(champion);
    const negative = sumTenacityCrack(champion);

    return {
        base: champion.baseTenacity,
        positiveLabel: "W / tenacity buffs",
        positiveValue: positive,
        negativeLabel: "Tenacity crack",
        negativeValue: negative,
        total: champion.tenacity,
    };
}

export default function ChampionUi({
    champion,
    enemy,
    isPlayer,
    turn,
    cooldowns,
    isResolvingAction,
    combatStatus,
    onSkillSelect,
    onSkillHover,
    previewSkillKey,
    previewAttackerRelics = [],
    previewAttackerFirstActionAvailable = false,
    currentRelics = [],
}: ChampionUiProps) {
    const healthRatio = champion.maxHealth > 0 ? champion.currentHealth / champion.maxHealth : 0;
    const isThisTurn = turn.playerTurn === isPlayer;
    const canAct = combatStatus === "active" && isThisTurn && !isResolvingAction;

    const armorBreakdown = getArmorBreakdown(champion);
    const tenacityBreakdown = getTenacityBreakdown(champion);
    const edgeTooltipPosition = isPlayer ? "left-0" : "right-0";
    const skillTooltipPosition = isPlayer ? "left-0" : "right-0";
    const [animatedPreviewDamage, setAnimatedPreviewDamage] = useState(0);
    const animatedPreviewDamageRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);
    const [damageFlash, setDamageFlash] = useState<DamageFlashState>({
        left: 0,
        width: 0,
        visible: false,
        animateOut: false,
    });
    const previousHealthRef = useRef(champion.currentHealth);
    const damageFlashRafRef = useRef<number | null>(null);
    const damageFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previewIncomingDamage = !isPlayer && previewSkillKey
        ? estimateChampionSkillDamage(enemy, champion, previewSkillKey, {
            attackerRelics: previewAttackerRelics,
            isAttackerFirstActionOfCombat: previewAttackerFirstActionAvailable,
        }).totalDamage
        : 0;
    const isPreviewContextActive = !isPlayer && combatStatus === "active" && turn.playerTurn;
    const previewTargetDamage = isPreviewContextActive && previewSkillKey ? previewIncomingDamage : 0;

    useEffect(() => {
        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            if (damageFlashRafRef.current !== null) {
                cancelAnimationFrame(damageFlashRafRef.current);
                damageFlashRafRef.current = null;
            }
            if (damageFlashTimeoutRef.current !== null) {
                clearTimeout(damageFlashTimeoutRef.current);
                damageFlashTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const startValue = animatedPreviewDamageRef.current;
        const endValue = previewTargetDamage;
        const durationMs = 240;
        const startTime = performance.now();

        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const t = Math.max(0, Math.min(1, elapsed / durationMs));
            const eased = 1 - Math.pow(1 - t, 3);
            const value = startValue + (endValue - startValue) * eased;

            animatedPreviewDamageRef.current = value;
            setAnimatedPreviewDamage(value);

            if (t < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                animationFrameRef.current = null;
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [previewTargetDamage]);

    useEffect(() => {
        const previousHealth = previousHealthRef.current;
        const currentHealth = champion.currentHealth;
        const maxHealth = champion.maxHealth;

        if (maxHealth > 0 && currentHealth < previousHealth) {
            const nextLeft = Math.max(0, Math.min(currentHealth / maxHealth, 1));
            const nextWidth = Math.max(0, Math.min((previousHealth - currentHealth) / maxHealth, 1));

            if (damageFlashRafRef.current !== null) {
                cancelAnimationFrame(damageFlashRafRef.current);
                damageFlashRafRef.current = null;
            }
            if (damageFlashTimeoutRef.current !== null) {
                clearTimeout(damageFlashTimeoutRef.current);
                damageFlashTimeoutRef.current = null;
            }

            // Show the lost chunk in red immediately.
            setDamageFlash({
                left: nextLeft,
                width: nextWidth,
                visible: true,
                animateOut: false,
            });

            // Then shrink it from right-to-left by reducing width to zero.
            damageFlashRafRef.current = requestAnimationFrame(() => {
                setDamageFlash({
                    left: nextLeft,
                    width: 0,
                    visible: true,
                    animateOut: true,
                });
                damageFlashRafRef.current = null;
            });

            damageFlashTimeoutRef.current = setTimeout(() => {
                setDamageFlash({
                    left: 0,
                    width: 0,
                    visible: false,
                    animateOut: false,
                });
                damageFlashTimeoutRef.current = null;
            }, DAMAGE_FLASH_DURATION_MS);
        }

        previousHealthRef.current = currentHealth;
    }, [champion.currentHealth, champion.maxHealth]);

    const previewDamageRatio = champion.maxHealth > 0 ? Math.max(0, Math.min(animatedPreviewDamage / champion.maxHealth, 1)) : 0;
    const previewRemainingRatio = champion.maxHealth > 0
        ? Math.max(0, Math.min((champion.currentHealth - animatedPreviewDamage) / champion.maxHealth, 1))
        : 0;
    const shouldShowPreview = isPreviewContextActive && (previewTargetDamage > 0 || animatedPreviewDamage > 0.05);
    const isLethalPreview = shouldShowPreview && previewIncomingDamage >= champion.currentHealth;

    return (
        <div className="w-full p-2 space-y-2">
            {champion.debuffs.length > 0 && (
                <div>
                    <div className="text-red-300 font-semibold">Debuffs</div>
                    <div className="text-sm flex gap-1 list-disc list-inside">
                        {champion.debuffs.map((debuff, index) => {
                            const info = debuffDetails[debuff.type];
                            return (
                                <div className="relative group" key={`${debuff.type}-${index}`}>
                                    <div className="relative w-10 h-10 border-2 rounded-md border-red-500/45">
                                        <Image src={`/icons/Debuff_${debuff.type}.webp`} alt={`Debuff ${debuff.type}`} width={100} height={100} />
                                        <span className="absolute right-0 top-0 text-red-500 font-bold">{debuff.remaining}</span>
                                    </div>
                                    <div
                                        className={`absolute ${edgeTooltipPosition} mt-1 z-20 w-52 max-w-[calc(100vw-1rem)] border bg-neutral-900 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity`}
                                    >
                                        <div className="font-bold text-red-300">{info.label}</div>
                                        <div>{info.effect(debuff)}</div>
                                        <div className="text-neutral-300">Duration: {debuff.duration} turns</div>
                                        <div className="text-neutral-300">Remaining: {debuff.remaining} turns</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {currentRelics.length > 0 && (
                <div>
                    <div className="text-violet-300 font-semibold">RELICS</div>
                    <div className="text-sm flex gap-1 list-disc list-inside">
                        {currentRelics.map((relicId, index) => {
                            const relicDef = RELIC_DEFS[relicId];
                            const iconMeta = RELIC_ICON_META[relicId] ?? { glyph: "RE", short: "Relic" };
                            return (
                                <div className="relative group" key={`${relicId}-${index}`}>
                                    <div className="relative w-10 h-10 border-2 rounded-md border-violet-400/75 bg-violet-950/25 flex flex-col items-center justify-center leading-none">
                                        <span className="text-[11px] font-extrabold text-violet-100 tracking-wide">{iconMeta.glyph}</span>
                                        <span className="text-[8px] text-violet-300">{iconMeta.short}</span>
                                    </div>
                                    <div
                                        className={`absolute ${edgeTooltipPosition} mt-1 z-20 w-56 max-w-[calc(100vw-1rem)] border bg-neutral-900 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity`}
                                    >
                                        <div className="font-bold text-violet-300">{relicDef?.label ?? relicId}</div>
                                        <div>{relicDef?.description ?? "No description available."}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {champion.buffs.length > 0 && (
                <div>
                    <div className="text-green-300 font-semibold">Buffs</div>
                    <div className="text-sm flex gap-1 list-disc list-inside">
                        {champion.buffs.map((buff, index) => {
                            const info = buffDetails[buff.type];
                            return (
                                <div className="relative group" key={`${buff.type}-${index}`}>
                                    <div className="relative w-10 h-10 border-2 rounded-md border-green-400">
                                        <Image src={`/icons/Buff_${buff.type}.webp`} alt={`Buff ${buff.type}`} width={100} height={100} />
                                        <span className="absolute right-0 top-0 text-green-200 font-bold">{buff.remaining}</span>
                                    </div>
                                    <div
                                        className={`absolute ${edgeTooltipPosition} mt-1 z-20 w-52 max-w-[calc(100vw-1rem)] border bg-neutral-900 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity`}
                                    >
                                        <div className="font-bold text-green-300">{info.label}</div>
                                        <div>{info.effect(buff)}</div>
                                        <div className="text-neutral-300">Duration: {buff.duration} turns</div>
                                        <div className="text-neutral-300">Remaining: {buff.remaining} turns</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="text-sm font-bold">
                <div className={isLethalPreview ? "text-red-400" : ""}>{champion.name}</div>
                <div
                    className={`w-full bg-gray-800 h-6 rounded overflow-hidden relative transition-all duration-300 ${
                        isLethalPreview ? "ring-2 ring-red-500 border border-red-500" : ""
                    }`}
                >
                    <div
                        className="h-full transition-all duration-500 ease-out"
                        style={{
                            width: `${Math.max(0, Math.min(1, healthRatio)) * 100}%`,
                            backgroundColor:
                                healthRatio <= 0.24 ? "rgb(239 68 68)" :
                                    healthRatio <= 0.49 ? "rgb(234 179 8)" :
                                        "rgb(34 197 94)",
                        }}
                    />
                    {damageFlash.visible && (
                        <div
                            className={`absolute top-0 h-full bg-red-500/90 pointer-events-none ${
                                damageFlash.animateOut ? "transition-[width] duration-[680ms] ease-out" : ""
                            }`}
                            style={{
                                left: `${damageFlash.left * 100}%`,
                                width: `${Math.max(0, damageFlash.width) * 100}%`,
                            }}
                        />
                    )}
                    {shouldShowPreview && (
                        <div
                            className={`absolute top-0 h-full transition-all duration-[350ms] ease-out ${
                                isLethalPreview ? "bg-red-500/95" : "bg-red-600/85"
                            }`}
                            style={{
                                left: `${previewRemainingRatio * 100}%`,
                                width: `${previewDamageRatio * 100}%`,
                            }}
                        />
                    )}
                    <div className="absolute inset-0 text-center text-white text-sm leading-6">
                        {shouldShowPreview
                            ? `${Math.max(Math.round(champion.currentHealth - animatedPreviewDamage), 0)} / ${champion.maxHealth}`
                            : `${champion.currentHealth} / ${champion.maxHealth}`}
                    </div>
                </div>
                {isLethalPreview && !isPlayer && (
                    <div className="text-[11px] text-red-400 mt-1">LETHAL</div>
                )}
                <div className="flex gap-x-3">
                    <div className="relative group text-xs cursor-help">
                        Armor: {champion.armor}
                        <div
                            className={`absolute ${edgeTooltipPosition} mt-1 z-20 w-52 max-w-[calc(100vw-1rem)] border bg-neutral-900 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-normal`}
                        >
                            <div className="font-bold text-blue-300">Armor</div>
                            <div className="text-neutral-300 mb-1">Reduces incoming physical damage.</div>
                            <div>{armorBreakdown.base} base</div>
                            {armorBreakdown.negativeValue > 0 && (
                                <div className="text-red-400">-{armorBreakdown.negativeValue} {armorBreakdown.negativeLabel}</div>
                            )}
                            {armorBreakdown.positiveValue > 0 && (
                                <div className="text-green-400">+{armorBreakdown.positiveValue} {armorBreakdown.positiveLabel}</div>
                            )}
                            <div className="font-bold mt-1">Total = {armorBreakdown.total}</div>
                        </div>
                    </div>

                    <div className="relative group text-xs cursor-help">
                        Tenacity: {champion.tenacity}
                        <div
                            className={`absolute ${edgeTooltipPosition} mt-1 z-20 w-56 max-w-[calc(100vw-1rem)] border bg-neutral-900 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-normal`}
                        >
                            <div className="font-bold text-cyan-300">Tenacity</div>
                            <div className="text-neutral-300 mb-1">Mitigates tenacity-crack pressure and helps defensive uptime.</div>
                            <div>{tenacityBreakdown.base} base</div>
                            {tenacityBreakdown.negativeValue > 0 && (
                                <div className="text-red-400">-{tenacityBreakdown.negativeValue} {tenacityBreakdown.negativeLabel}</div>
                            )}
                            {tenacityBreakdown.positiveValue > 0 && (
                                <div className="text-green-400">+{tenacityBreakdown.positiveValue} {tenacityBreakdown.positiveLabel}</div>
                            )}
                            <div className="font-bold mt-1">Total = {tenacityBreakdown.total}</div>
                        </div>
                    </div>
                </div>
                {champion.affixes.length > 0 && (
                    <div className="text-xs text-orange-300">
                        <div>Affixes</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {champion.affixes.map((id) => {
                                const affix = AFFIX_DEFS[id];
                                return (
                                    <div key={id} className="relative group">
                                        <div className="px-2 py-[2px] border border-orange-400/60 bg-orange-950/20 rounded cursor-help">
                                            {affix?.label ?? id}
                                        </div>
                                        <div
                                            className={`absolute ${edgeTooltipPosition} mt-1 z-20 w-56 max-w-[calc(100vw-1rem)] border bg-neutral-900 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-normal`}
                                        >
                                            <div className="font-bold text-orange-300">{affix?.label ?? id}</div>
                                            <div>{affix?.description ?? "No description available."}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {!isPlayer && combatStatus === "active" && turn.playerTurn === false && (
                    <div className="text-xs text-red-300 mt-1">Enemy is choosing...</div>
                )}
                {isPlayer && combatStatus === "active" && turn.playerTurn === true && enemy.currentHealth > 0 && (
                    <div className="text-xs text-green-300 mt-1">Choose an ability</div>
                )}
            </div>

            <div className="flex gap-2 select-none">
                {SKILL_KEYS.map((key) => {
                    const skill = champion.skills[key];
                    const cooldown = cooldowns[key] || 0;
                    const isDisabled = cooldown > 0 || !canAct || !isPlayer;
                    const upgradeLevel = key === "Attack" ? 0 : (champion.upgradedSkills[key] ?? 0);
                    const isUpgradedSkill = key !== "Attack" && upgradeLevel > 0;

                    const estimate = estimateChampionSkillDamage(champion, enemy, key, {
                        attackerRelics: previewAttackerRelics,
                        isAttackerFirstActionOfCombat: previewAttackerFirstActionAvailable,
                    });
                    const estimatedTotalDamage = estimate.totalDamage;
                    const estimatedTrueDamage = estimate.baseTrueDamage + estimate.bonusTrueDamage;

                    return (
                        <div key={key} className="relative group">
                            <button
                                type="button"
                                onClick={() => onSkillSelect?.(key)}
                                onMouseEnter={() => onSkillHover?.(key)}
                                onMouseLeave={() => onSkillHover?.(null)}
                                onFocus={() => onSkillHover?.(key)}
                                onBlur={() => onSkillHover?.(null)}
                                disabled={isDisabled}
                                className={`w-12 h-12 flex items-center justify-center text-white font-bold rounded border
                                ${isUpgradedSkill ? "border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.65)]" : "border-white"}
                                ${isDisabled ? "cursor-not-allowed opacity-50" : "opacity-100 hover:brightness-110"}`}
                            >
                                <span>
                                    {key === "Attack"
                                        ? <Image src="/Basic_Attack.webp" alt={`Skill ${key}`} width={1000} height={1000} />
                                        : <Image src={`/models/${champion.name}/icons/${key}.webp`} alt={`Skill ${key}`} width={1000} height={1000} />
                                    }
                                </span>

                                {cooldown > 0 && (
                                    <div className="absolute bottom-0 left-0 h-full w-full border border-black bg-black opacity-80 flex items-center justify-center text-xs font-bold text-white">
                                        {cooldown}
                                    </div>
                                )}
                                {isUpgradedSkill && (
                                    <div className="absolute -top-2 -right-2 text-[10px] rounded-full bg-yellow-400 text-black w-5 h-5 flex items-center justify-center font-bold border border-black">
                                        {upgradeLevel}
                                    </div>
                                )}
                            </button>

                            <div
                                className={`absolute ${skillTooltipPosition} w-[13rem] max-w-[calc(100vw-1rem)] min-h-[5rem] flex flex-col text-center
                                mb-1 border bg-gray-800 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20`}
                            >
                                <div className="font-bold text-yellow-300">Estimated Damage</div>
                                <div>Total: {estimatedTotalDamage}</div>
                                {estimate.basePhysicalDamage > 0 && (
                                    <>
                                        <div>Base Physical: {estimate.basePhysicalDamage}</div>
                                        <div className="text-red-300">- Enemy Armor ({enemy.armor})</div>
                                        <div>Final Physical: {estimate.finalPhysicalDamage}</div>
                                    </>
                                )}
                                {estimatedTrueDamage > 0 && <div>True Damage: {estimatedTrueDamage}</div>}
                                {estimate.bonusTrueDamage > 0 && (
                                    <div className="text-orange-300">R Bonus (armor crack): +{estimate.bonusTrueDamage}</div>
                                )}
                                {estimate.isExecute && estimate.executeThreshold !== null && (
                                    <div className="text-red-400">Execute active (target &lt;= {estimate.executeThreshold} HP)</div>
                                )}

                                <div className="border-t border-neutral-600 mt-1 pt-1">
                                    {skill.heal && <div>Heal: {skill.heal}</div>}
                                    {skill.armorCrack && <div>Armor Crack: {skill.armorCrack}</div>}
                                    {skill.tenacityCrack && <div>Tenacity Crack: {skill.tenacityCrack}</div>}
                                    {skill.armorBoost && <div>Armor Boost: {skill.armorBoost}</div>}
                                    {skill.tenacityBoost && <div>Tenacity Boost: {skill.tenacityBoost}</div>}
                                    <div>CD: {skill.cooldown}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
