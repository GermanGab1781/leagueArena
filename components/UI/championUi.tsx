import { useEffect, useState } from "react";

export default function ChampionUi({ champion, setChampion, enemy, setEnemy, isPlayer, championModelData, setAnimations, setTurn, turn }: ChampionUiProps) {
    function getHealthColor(ratio: number): string {
        if (ratio <= 0.24) return 'bg-red-500';
        if (ratio <= 0.49) return 'bg-yellow-500';
        return 'bg-green-500';
    }
    const healthChampion = champion.currentHealth / champion.maxHealth;
    /* make a single skill function that takes the type then it process it */
    const [isProcessing, setIsProcessing] = useState(false);
    const [cooldowns, setCooldowns] = useState<{ [key: string]: number }>({});

    const useSkill = (key: string, info: champion, animation: AnimationStep[], durationMs: number) => {
        const skill = info.skills[key];
        if (!skill) return;
        setIsProcessing(true);
        setAnimations(animation);
        // Start of turn processing (e.g., animation starts here)
        // Add any visual feedback or sound here

        setTimeout(() => {
            // Apply skill effects
            if (skill.type === "attack") {
                if (skill.damage) {
                    // Apply damage to enemy or whatever target logic you have
                    // e.g., setEnemyHealth(prev => Math.max(0, prev - skill.damage));
                }
                if (skill.heal) {
                    // e.g., setChampion(prev => ({ ...prev, currentHealth: ... }));
                }
                if (skill.debuff) {
                    // Apply debuff effect
                }
            }

            if (skill.type === "defense") {
                if (skill.armorBoost) {
                    // Apply armor boost
                }
                if (skill.tenacity) {
                    // Apply tenacity boost
                }
            }

            if (skill.type === "debuff") {
                if (skill.armorCrack) {
                    // Apply armor crack to enemy
                }
                if (skill.tenacityCrack) {
                    // Apply tenacity crack
                }
            }

            // End turn
            setTurn((prev) => ({
                number: prev.number + 1,
                playerTurn: !prev.playerTurn,
            }));
            setCooldowns(prev =>
                Object.fromEntries(
                    Object.entries(prev).map(([key, val]) => [key, Math.max(0, val - 1)])
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
        const skill = champion.skills[key];
        if (cooldowns[key] > 0 || isProcessing) return;
        useSkill(key, champion, championModelData.animations[key], skill.time);
        setCooldowns(prev => ({ ...prev, [key]: skill.cooldown }));
    };

    const healthRatio = champion.currentHealth / champion.maxHealth;

    return (
        <div className="w-full p-2 space-y-2">
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
                <div className="text-xs">Armor: {champion.armor}</div>
            </div>

            {/* Skill Bar */}
            <div className="flex gap-2">
                {["Attack", "Q", "W", "E", "R"].map((key) => {
                    const skill = champion.skills[key];
                    const cooldown = cooldowns[key] || 0;
                    const isDisabled = cooldown > 0 || isProcessing;

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
                                CD: {skill.cooldown-1}s
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}