import { useEffect, useState } from "react";
import Image from "next/image";
import { applyDebuffs, processDebuffs } from "@/lib/utils/combat";
export default function ChampionUi({ champion, setChampion, enemy, setEnemy, isPlayer, championModelData, setAnimations, setTurn, turn }: ChampionUiProps) {
    /* make a single skill function that takes the type then it process it */
    const [isProcessing, setIsProcessing] = useState(false);
    const [cooldowns, setCooldowns] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        const isCurrentPlayerTurn = turn.playerTurn === isPlayer;
        const processTurnStart = (unitSetter: React.Dispatch<React.SetStateAction<champion>>) => {
                unitSetter(prev => {
                    const updated = processDebuffs(prev);
                    if (updated.stunned) {
                        setIsProcessing(false);
                        setTurn(t => ({ number: t.number + 1, playerTurn: !t.playerTurn }));
                    }
                    return updated;
                });
            };
        if (isCurrentPlayerTurn) {
            processTurnStart(setChampion)
        }else{
            processTurnStart(setChampion)
        }
    }, [turn.number])


    const useSkill = (key: string, info: champion, animation: AnimationStep[], durationMs: number) => {
        const skill = info.skills[key];
        if (!skill) return;
        setIsProcessing(true);
        setAnimations(animation);
        setTimeout(() => {
            if (skill.type === "attack") {
                // Damage enemy
                setEnemy(prev => {
                    let newHealth = prev.currentHealth;

                    if (skill.physicalDamage) {
                        const reduced = Math.max(skill.physicalDamage - prev.armor, 0);
                        newHealth -= reduced;
                    }

                    if (skill.trueDamage) {
                        newHealth -= skill.trueDamage;
                    }

                    // Apply debuffs and process them immediately
                    return applyDebuffs({
                        ...prev,
                        currentHealth: Math.max(newHealth, 0),
                    }, skill);
                });

                // Heal self
                if (skill.heal) {
                    setChampion(prev => ({
                        ...prev,
                        currentHealth: Math.min(prev.currentHealth + skill.heal!, prev.maxHealth),
                    }));
                }
            }

            if (skill.type === "defense") {
                if (skill.armorBoost || skill.tenacity) {
                    setChampion(prev => ({
                        ...prev,
                        armor: prev.armor + (skill.armorBoost || 0),
                        tenacity: prev.tenacity + (skill.tenacity || 0),
                    }));
                }
            }

            // Apply debuffs that weren't part of attack damage (e.g., armorCrack only skills)
            if (skill.type !== "attack") {
                setEnemy(prev => applyDebuffs(prev, skill));
            }

            // End turn
            setTurn(prev => ({
                number: prev.number + 1,
                playerTurn: !prev.playerTurn,
            }));

            // Reduce cooldowns
            setCooldowns(prev =>
                Object.fromEntries(
                    Object.entries(prev).map(([k, v]) => [k, Math.max(0, v - 1)])
                )
            );

            setIsProcessing(false);
        }, durationMs);
    };


    // Decrease cooldown every second
    //may come of use later
    /* useEffect(() => {
        const interval = setInterval(() => {
            setCooldowns(prev =>
                Object.fromEntries(
                    Object.entries(prev).map(([key, val]) => [key, Math.max(0, val - 1)])
                )
            );
        }, 1000);
        return () => clearInterval(interval);
    }, []); */



    const handleSkill = (key: string) => {
        if (isPlayer && turn.playerTurn === true) {
            const skill = champion.skills[key];
            if (cooldowns[key] > 0 || isProcessing) return;
            useSkill(key, champion, championModelData.animations[key], skill.time);
            setCooldowns(prev => ({ ...prev, [key]: skill.cooldown }));
        }
        if (!isPlayer && turn.playerTurn === false) {
            const skill = champion.skills[key];
            if (cooldowns[key] > 0 || isProcessing) return;
            useSkill(key, champion, championModelData.animations[key], skill.time);
            setCooldowns(prev => ({ ...prev, [key]: skill.cooldown }));
        }
    };

    const healthRatio = champion.currentHealth / champion.maxHealth;

    return (
        <div className="w-full p-2 space-y-2">
            <div>
                {/* {debuff.type} (-{debuff.value || 0}) — {debuff.remaining} turn{debuff.remaining !== 1 && "s"} left */}
                Debuffs
                {champion.debuffs.length > 0 && (
                    <div className="text-sm flex gap-1 list-disc list-inside">
                        {champion.debuffs.map((debuff, index) => (
                            <div className="relative w-10 h-10 border-2 rounded-md border-red-500/45 " key={index}>
                                <Image src={`/icons/Debuff_${debuff.type}.webp`} alt={`Debuff of type ${debuff}`} width={100} height={100} />
                                <span className="absolute right-0 top-0 text-red-500 font-bold">{debuff.remaining}</span>
                            </div>
                        ))}
                    </div>)}
            </div>
            {/* Health Bar */}
            <div className="text-sm font-bold">
                <div>{champion.name}</div>
                <div className="w-full bg-gray-800 h-6 rounded overflow-hidden relative">
                    <div
                        className="h-full transition-all duration-500"
                        style={{
                            width: `${healthRatio * 100}%`,
                            backgroundColor:
                                healthRatio <= 0.24 ? 'rgb(239 68 68)' :
                                    healthRatio <= 0.49 ? 'rgb(234 179 8)' :
                                        'rgb(34 197 94)',
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
            </div>

            {/* Skill Bar */}
            <div className="flex gap-2 select-none">
                {["Attack", "Q", "W", "E", "R"].map((key) => {
                    const skill = champion.skills[key];
                    const cooldown = cooldowns[key] || 0;
                    const isDisabled = cooldown > 0 || isProcessing || (isPlayer && turn.playerTurn) || (!isPlayer && !turn.playerTurn);
                    /* console.log(`/models/${champion.name}/icons/${key}.webp`) */
                    return (
                        <div key={key} className="relative group">

                            <div
                                onClick={() => handleSkill(key)}
                                className={`w-12 h-12 flex items-center justify-center  text-white font-bold rounded cursor-pointer select-none border border-white 
                ${isDisabled ? " cursor-not-allowed" : "opacity-50"}`}
                            >
                                {/* Placeholder image block */}

                                <span>
                                    {key === "Attack"
                                        ? (<Image src={`/Basic_Attack.webp`} alt={`Skill ${key}`} width={1000} height={1000} />)
                                        : (<Image src={`/models/${champion.name}/icons/${key}.webp`} alt={`Skill ${key}`} width={1000} height={1000} />)
                                    }
                                </span>

                                {/* Cooldown overlay */}
                                {cooldown > 0 && (
                                    <div className="absolute bottom-0 left-0 h-full w-full border border-black bg-black opacity-80 flex items-center justify-center text-xs font-bold text-white">
                                        {cooldown}
                                    </div>
                                )}
                            </div>
                            {/* Tooltip on hover */}
                            <div className="absolute left-1/2 translate-x-[-50%]  w-[10vw] h-[10vh] flex flex-col place-content-center text-center
                            mb-1 border bg-gray-600 text-white text-xs p-1 rounded 
                            opacity-0 group-hover:opacity-100 transition-opacity
                            ">
                                {skill.physicalDamage && <div className="">Physical Damage: {skill.physicalDamage}</div>}
                                {skill.trueDamage && <div className="">True Damage: {skill.trueDamage}</div>}
                                {skill.armorCrack && <div className="">Armor Crack: {skill.armorCrack}</div>}
                                {skill.tenacityCrack && <div className="">Tenacity Crack: {skill.tenacityCrack}</div>}
                                {skill.armorBoost && <div className="">Armor Boost: {skill.armorBoost}</div>}
                                <div>CD: {skill.cooldown - 1}s</div>

                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}