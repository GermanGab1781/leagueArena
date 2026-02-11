import Image from "next/image";
import { SKILL_KEYS } from "@/lib/champions";

export default function ChampionUi({
    champion,
    enemy,
    isPlayer,
    turn,
    cooldowns,
    isResolvingAction,
    combatStatus,
    onSkillSelect,
}: ChampionUiProps) {
    const healthRatio = champion.maxHealth > 0 ? champion.currentHealth / champion.maxHealth : 0;
    const isThisTurn = turn.playerTurn === isPlayer;
    const canAct = combatStatus === "active" && isThisTurn && !isResolvingAction;

    return (
        <div className="w-full p-2 space-y-2">
            <div>
                Debuffs
                {champion.debuffs.length > 0 && (
                    <div className="text-sm flex gap-1 list-disc list-inside">
                        {champion.debuffs.map((debuff, index) => (
                            <div className="relative w-10 h-10 border-2 rounded-md border-red-500/45" key={`${debuff.type}-${index}`}>
                                <Image src={`/icons/Debuff_${debuff.type}.webp`} alt={`Debuff ${debuff.type}`} width={100} height={100} />
                                <span className="absolute right-0 top-0 text-red-500 font-bold">{debuff.remaining}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div>
                Buffs
                {champion.buffs.length > 0 && (
                    <div className="text-sm flex gap-1 list-disc list-inside">
                        {champion.buffs.map((buff, index) => (
                            <div className="relative w-10 h-10 border-2 rounded-md border-green-400" key={`${buff.type}-${index}`}>
                                <Image src={`/icons/Buff_${buff.type}.webp`} alt={`Buff ${buff.type}`} width={100} height={100} />
                                <span className="absolute right-0 top-0 text-green-200 font-bold">{buff.remaining}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="text-sm font-bold">
                <div>{champion.name}</div>
                <div className="w-full bg-gray-800 h-6 rounded overflow-hidden relative">
                    <div
                        className="h-full transition-all duration-500"
                        style={{
                            width: `${Math.max(0, Math.min(1, healthRatio)) * 100}%`,
                            backgroundColor:
                                healthRatio <= 0.24 ? "rgb(239 68 68)" :
                                    healthRatio <= 0.49 ? "rgb(234 179 8)" :
                                        "rgb(34 197 94)",
                        }}
                    />
                    <div className="absolute inset-0 text-center text-white text-sm leading-6">
                        {champion.currentHealth} / {champion.maxHealth}
                    </div>
                </div>
                <div className="flex gap-x-3">
                    <div className="text-xs">Armor: {champion.armor}</div>
                    <div className="text-xs">Tenacity: {champion.tenacity}</div>
                </div>
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

                    return (
                        <div key={key} className="relative group">
                            <button
                                type="button"
                                onClick={() => onSkillSelect?.(key)}
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
                                className="absolute left-1/2 translate-x-[-50%] w-[11rem] min-h-[5rem] flex flex-col place-content-center text-center
                                mb-1 border bg-gray-700 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            >
                                {skill.physicalDamage && <div>Physical Damage: {skill.physicalDamage}</div>}
                                {skill.trueDamage && <div>True Damage: {skill.trueDamage}</div>}
                                {skill.heal && <div>Heal: {skill.heal}</div>}
                                {skill.armorCrack && <div>Armor Crack: {skill.armorCrack}</div>}
                                {skill.tenacityCrack && <div>Tenacity Crack: {skill.tenacityCrack}</div>}
                                {skill.armorBoost && <div>Armor Boost: {skill.armorBoost}</div>}
                                {skill.tenacityBoost && <div>Tenacity Boost: {skill.tenacityBoost}</div>}
                                <div>CD: {skill.cooldown}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
