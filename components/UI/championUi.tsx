import { useEffect, useState } from "react";

export default function ChampionUi({ champion, setChampion, enemy, setEnemy, isPlayer, championModelData, setAnimations, setTurn, turn }: ChampionUiProps) {
    /* make a single skill function that takes the type then it process it */
    const [isProcessing, setIsProcessing] = useState(false);
    const [cooldowns, setCooldowns] = useState<{ [key: string]: number }>({});

    function processDebuffs(champ: champion): champion {
        let updated = { ...champ };

        // Reset to base stats first
        updated.armor = updated.baseArmor;
        updated.tenacity = updated.baseTenacity;
        updated.stunned = false;

        const activeDebuffs: Debuff[] = [];

        updated.debuffs.forEach((d) => {
            // Apply effect
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
                // Add other debuffs if needed
            }

            // Only keep if still active
            if (d.remaining > 1) {
                activeDebuffs.push({ ...d, remaining: d.remaining - 1 });
            }
        });

        updated.debuffs = activeDebuffs;
        return updated;
    }

    const useSkill = (key: string, info: champion, animation: AnimationStep[], durationMs: number) => {
        const skill = info.skills[key];
        if (!skill) return;
        setIsProcessing(true);
        setAnimations(animation);

        const isCurrentPlayerTurn = turn.playerTurn === isPlayer;

        // Helper: apply debuffs and immediately process them
        const applyDebuffs = (unit: champion, skill: Skill): champion => {
            const newDebuffs = [...unit.debuffs];

            /* Add one more since it applies on same turn */
            if (skill.debuff) {
                newDebuffs.push({ type: "custom", value: skill.debuff, duration: 5, remaining: 5 });
            }

            if (skill.armorCrack) {
                newDebuffs.push({ type: "armorCrack", value: skill.armorCrack, duration: 5, remaining: 5 });
            }

            if (skill.tenacityCrack) {
                newDebuffs.push({ type: "tenacityCrack", value: skill.tenacityCrack, duration: 5, remaining: 5 });
            }

            return processDebuffs({ ...unit, debuffs: newDebuffs });
        };

        // Process debuffs at the start of the turn
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
            isPlayer ? processTurnStart(setChampion) : processTurnStart(setEnemy);
        }

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
                Debuffs
                {champion.debuffs.length > 0 && (
                    <ul className="text-sm list-disc list-inside">
                        {champion.debuffs.map((debuff, index) => (
                            <li key={index}>
                                {debuff.type} (-{debuff.value || 0}) — {debuff.remaining} turn{debuff.remaining !== 1 && "s"} left
                            </li>
                        ))}
                    </ul>)}
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
                    const isDisabled = cooldown > 0 || isProcessing || turn.playerTurn === false;

                    return (
                        <div key={key} className="relative group">

                            <div
                                onClick={() => handleSkill(key)}
                                className={`w-12 h-12 flex items-center justify-center bg-blue-500 text-white font-bold rounded cursor-pointer select-none border border-white 
                ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {/* Placeholder image block */}
                                <span>{key}</span>

                                {/* Cooldown overlay */}
                                {cooldown > 0 && (
                                    <div className="absolute bottom-0 left-0 h-full w-full bg-black bg-opacity-60 flex items-center justify-center text-xs font-bold text-white">
                                        {cooldown}
                                    </div>
                                )}
                            </div>
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full mb-1 w-24 bg-black text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                CD: {skill.cooldown - 1}s
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}