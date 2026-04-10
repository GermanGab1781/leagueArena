'use client'
import { championsData } from '@/lib/championData';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ChampionModel } from "../championModel";
import MainUi from "../UI/mainUi";
import { chooseEnemySkill } from '@/lib/utils/ai';
import { EMPTY_COOLDOWNS } from '@/lib/champions';
import { isDead, processTurnStart, resolveSkillCast, tickCooldowns } from '@/lib/utils/combat';


const TURN_SKIP_DELAY_MS = 700;
const AI_THINK_DELAY_MS = 900;

export default function Combat({
    player,
    setPlayer,
    enemy,
    setEnemy,
    playerRelics = [],
    enemyRelics = [],
    onPlayerLose,
    onPlayerWin,
    goldReward = 0,
    xpReward = 0,
}: CombatProps) {
    const playerKey = player.name.toLowerCase().replace(/\s+/g, '');
    const enemyKey = enemy.name.toLowerCase().replace(/\s+/g, '');

    const playerModelData: ChampionModelData = championsData[playerKey];
    const enemyModelData: ChampionModelData = championsData[enemyKey];

    const [playerModelAnim, setPlayerModelAnim] = useState<AnimationStep[]>(playerModelData.animations.idle);
    const [enemyModelAnim, setEnemyModelAnim] = useState<AnimationStep[]>(enemyModelData.animations.idle);

    const [turn, setTurn] = useState<turn>({ number: 1, playerTurn: true });
    const [combatStatus, setCombatStatus] = useState<CombatStatus>("active");
    const [isResolvingAction, setIsResolvingAction] = useState(false);
    const [showIntro, setShowIntro] = useState(true);
    const [introFading, setIntroFading] = useState(false);
    const [victoryData, setVictoryData] = useState<{ player: champion; enemy: champion } | null>(null);

    const [playerCooldowns, setPlayerCooldowns] = useState<SkillCooldowns>({ ...EMPTY_COOLDOWNS });
    const [enemyCooldowns, setEnemyCooldowns] = useState<SkillCooldowns>({ ...EMPTY_COOLDOWNS });

    const [hitFlash, setHitFlash] = useState<{ side: "player" | "enemy"; heavy: boolean } | null>(null);
    const [stunIndicator, setStunIndicator] = useState<"player" | "enemy" | null>(null);

    const playerRef = useRef(player);
    const enemyRef = useRef(enemy);
    const turnRef = useRef(turn);
    const statusRef = useRef<CombatStatus>(combatStatus);
    const playerCooldownsRef = useRef(playerCooldowns);
    const enemyCooldownsRef = useRef(enemyCooldowns);
    const isResolvingActionRef = useRef(isResolvingAction);
    const processedTurnKeyRef = useRef<string | null>(null);
    const actionTakenTurnKeyRef = useRef<string | null>(null);
    const aiScheduledTurnKeyRef = useRef<string | null>(null);
    const hasFinishedRef = useRef(false);
    const playerFirstActionUsedRef = useRef(false);
    const enemyFirstActionUsedRef = useRef(false);
    const timeoutHandles = useRef<Array<ReturnType<typeof setTimeout>>>([]);

    useEffect(() => {
        playerRef.current = player;
    }, [player]);

    useEffect(() => {
        enemyRef.current = enemy;
    }, [enemy]);

    useEffect(() => {
        turnRef.current = turn;
    }, [turn]);

    useEffect(() => {
        statusRef.current = combatStatus;
    }, [combatStatus]);

    useEffect(() => {
        playerCooldownsRef.current = playerCooldowns;
    }, [playerCooldowns]);

    useEffect(() => {
        enemyCooldownsRef.current = enemyCooldowns;
    }, [enemyCooldowns]);

    useEffect(() => {
        isResolvingActionRef.current = isResolvingAction;
    }, [isResolvingAction]);

    const clearAllTimeouts = useCallback(() => {
        for (const handle of timeoutHandles.current) {
            clearTimeout(handle);
        }
        timeoutHandles.current = [];
    }, []);

    const registerTimeout = useCallback((callback: () => void, delay: number) => {
        const handle = setTimeout(() => {
            timeoutHandles.current = timeoutHandles.current.filter((item) => item !== handle);
            callback();
        }, delay);
        timeoutHandles.current.push(handle);
    }, []);

    useEffect(() => {
        return () => clearAllTimeouts();
    }, [clearAllTimeouts]);

    useEffect(() => {
        const fadeTimer = setTimeout(() => setIntroFading(true), 2000);
        const hideTimer = setTimeout(() => setShowIntro(false), 2500);
        return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
    }, []);

    const finishCombat = useCallback((playerWon: boolean, finalPlayer: champion, finalEnemy: champion) => {
        if (hasFinishedRef.current || statusRef.current !== "active") return;

        hasFinishedRef.current = true;
        clearAllTimeouts();
        setIsResolvingAction(false);
        isResolvingActionRef.current = false;

        if (playerWon) {
            setCombatStatus("playerWon");
            if (enemyModelData.animations.death) {
                setEnemyModelAnim(enemyModelData.animations.death);
            }
            setVictoryData({ player: finalPlayer, enemy: finalEnemy });
            return;
        }

        setCombatStatus("playerLost");
        if (playerModelData.animations.death) {
            setPlayerModelAnim(playerModelData.animations.death);
        }
        onPlayerLose?.(finalPlayer, finalEnemy);
    }, [clearAllTimeouts, enemyModelData.animations.death, onPlayerLose, onPlayerWin, playerModelData.animations.death]);

    const handleDevSkip = useCallback(() => {
        if (statusRef.current !== "active") return;

        const currentPlayer = playerRef.current;
        const currentEnemy = {
            ...enemyRef.current,
            currentHealth: 0,
        };

        enemyRef.current = currentEnemy;
        setEnemy(currentEnemy);
        finishCombat(true, currentPlayer, currentEnemy);
    }, [finishCombat, setEnemy]);

    const executeSkill = useCallback((skillKey: SkillKey, isPlayerActor: boolean) => {
        if (statusRef.current !== "active") return;
        if (turnRef.current.playerTurn !== isPlayerActor) return;
        if (isResolvingActionRef.current) return;

        const turnKey = `${turnRef.current.number}-${turnRef.current.playerTurn ? "P" : "E"}`;
        if (actionTakenTurnKeyRef.current === turnKey) return;

        const actor = isPlayerActor ? playerRef.current : enemyRef.current;
        const actorCooldowns = isPlayerActor ? playerCooldownsRef.current : enemyCooldownsRef.current;
        const skill = actor.skills[skillKey];

        if (!skill || actorCooldowns[skillKey] > 0) return;

        actionTakenTurnKeyRef.current = turnKey;
        setIsResolvingAction(true);
        isResolvingActionRef.current = true;
        const isFirstAction = isPlayerActor ? !playerFirstActionUsedRef.current : !enemyFirstActionUsedRef.current;
        if (isPlayerActor) {
            playerFirstActionUsedRef.current = true;
        } else {
            enemyFirstActionUsedRef.current = true;
        }

        if (isPlayerActor) {
            setPlayerModelAnim(playerModelData.animations[skillKey]);
        } else {
            setEnemyModelAnim(enemyModelData.animations[skillKey]);
        }

        registerTimeout(() => {
            if (statusRef.current !== "active") return;

            const latestActor = isPlayerActor ? playerRef.current : enemyRef.current;
            const latestTarget = isPlayerActor ? enemyRef.current : playerRef.current;
            const result = resolveSkillCast(latestActor, latestTarget, skillKey, {
                attackerRelics: isPlayerActor ? playerRelics : enemyRelics,
                isAttackerFirstActionOfCombat: isFirstAction,
                attackerAffixes: latestActor.affixes,
                defenderAffixes: latestTarget.affixes,
            });

            if (isPlayerActor) {
                playerRef.current = result.attacker;
                enemyRef.current = result.defender;
                setPlayer(result.attacker);
                setEnemy(result.defender);
                setPlayerCooldowns((prev) => tickCooldowns(prev, skillKey, result.skill.cooldown));
            } else {
                enemyRef.current = result.attacker;
                playerRef.current = result.defender;
                setEnemy(result.attacker);
                setPlayer(result.defender);
                setEnemyCooldowns((prev) => tickCooldowns(prev, skillKey, result.skill.cooldown));
            }

            if (result.totalDamageDealt > 0) {
                const hitSide = isPlayerActor ? "enemy" : "player";
                const maxHP = isPlayerActor ? latestTarget.maxHealth : latestActor.maxHealth;
                const heavy = result.totalDamageDealt / maxHP >= 0.18;
                setHitFlash({ side: hitSide, heavy });
                setTimeout(() => setHitFlash(null), heavy ? 420 : 260);
            }

            const currentPlayer = playerRef.current;
            const currentEnemy = enemyRef.current;

            if (isDead(currentEnemy)) {
                finishCombat(true, currentPlayer, currentEnemy);
                return;
            }

            if (isDead(currentPlayer)) {
                finishCombat(false, currentPlayer, currentEnemy);
                return;
            }

            // Wait for walk-back / return animation before handing the turn to the next actor
            registerTimeout(() => {
                if (statusRef.current !== "active") return;
                setIsResolvingAction(false);
                isResolvingActionRef.current = false;
                setTurn((prev) => ({ number: prev.number + 1, playerTurn: !prev.playerTurn }));
            }, skill.returnDelay ?? 0);
        }, skill.time);
    }, [
        enemyModelData.animations,
        enemyRelics,
        finishCombat,
        playerRelics,
        playerModelData.animations,
        registerTimeout,
        setEnemy,
        setPlayer,
    ]);

    useEffect(() => {
        if (combatStatus !== "active") return;
        if (isResolvingActionRef.current) return;

        const turnKey = `${turn.number}-${turn.playerTurn ? "P" : "E"}`;
        if (processedTurnKeyRef.current === turnKey) return;
        processedTurnKeyRef.current = turnKey;

        const isPlayerTurn = turn.playerTurn;
        const currentActor = isPlayerTurn ? playerRef.current : enemyRef.current;
        const processedActor = processTurnStart(currentActor);

        if (isPlayerTurn) {
            playerRef.current = processedActor;
            setPlayer(processedActor);
        } else {
            enemyRef.current = processedActor;
            setEnemy(processedActor);
        }

        const currentPlayer = isPlayerTurn ? processedActor : playerRef.current;
        const currentEnemy = isPlayerTurn ? enemyRef.current : processedActor;

        if (isDead(currentPlayer)) {
            finishCombat(false, currentPlayer, currentEnemy);
            return;
        }

        if (isDead(currentEnemy)) {
            finishCombat(true, currentPlayer, currentEnemy);
            return;
        }

        if (processedActor.stunned) {
            setStunIndicator(isPlayerTurn ? "player" : "enemy");
            setTimeout(() => setStunIndicator(null), TURN_SKIP_DELAY_MS - 100);
            registerTimeout(() => {
                if (statusRef.current !== "active") return;
                setTurn((prev) => ({ number: prev.number + 1, playerTurn: !prev.playerTurn }));
            }, TURN_SKIP_DELAY_MS);
            return;
        }

        if (!isPlayerTurn) {
            if (aiScheduledTurnKeyRef.current === turnKey) return;
            aiScheduledTurnKeyRef.current = turnKey;

            registerTimeout(() => {
                if (statusRef.current !== "active") return;

                const skillChoice = chooseEnemySkill({
                    enemy: enemyRef.current,
                    player: playerRef.current,
                    cooldowns: enemyCooldownsRef.current,
                    turnNumber: turnRef.current.number,
                });

                executeSkill(skillChoice, false);
            }, AI_THINK_DELAY_MS);
        }
    }, [combatStatus, executeSkill, finishCombat, registerTimeout, setEnemy, setPlayer, turn.number, turn.playerTurn]);

    return (
        <div className="w-full h-full relative">
            {/* Three.js Scene */}
            <Canvas camera={{ position: [0, 1.5, 4], fov: 70 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[2, 2, 2]} />
                <Suspense fallback={null}>
                    {/* Player model */}
                    <ChampionModel
                        data={playerModelData}
                        position={[-1, -1, 2]}
                        rotation={[0, 140, 0]}
                        animationsActive={playerModelAnim}
                        setAnimations={setPlayerModelAnim}
                    />
                    {/* Enemy model */}
                    <ChampionModel
                        data={enemyModelData}
                        position={[3, -1, -1]}
                        rotation={[0, -50, 0]}
                        animationsActive={enemyModelAnim}
                        setAnimations={setEnemyModelAnim}
                    />
                </Suspense>
            </Canvas>

            {/* Hit flash overlays */}
            {hitFlash && (
                <div
                    className={`absolute inset-0 pointer-events-none z-[5] transition-opacity duration-100 ${
                        hitFlash.heavy
                            ? "bg-red-500/30"
                            : "bg-red-400/18"
                    } ${hitFlash.side === "player" ? "clip-left" : "clip-right"}`}
                    style={{
                        clipPath: hitFlash.side === "player" ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)",
                    }}
                />
            )}

            {/* Stun indicators */}
            {stunIndicator && (
                <div
                    className={`absolute top-1/3 z-[10] pointer-events-none ${
                        stunIndicator === "player" ? "left-4 sm:left-12" : "right-4 sm:right-12"
                    }`}
                >
                    <div className="bg-yellow-400/90 text-black text-xs sm:text-sm font-black tracking-[0.25em] uppercase px-3 py-1.5 shadow-lg animate-pulse">
                        STUNNED
                    </div>
                </div>
            )}

            {/* UI overlays */}
            <MainUi
                turn={turn}
                player={player}
                enemy={enemy}
                playerModelData={playerModelData}
                enemyModelData={enemyModelData}
                setPlayerModelAnim={setPlayerModelAnim}
                setEnemyModelAnim={setEnemyModelAnim}
                playerCooldowns={playerCooldowns}
                enemyCooldowns={enemyCooldowns}
                isResolvingAction={isResolvingAction}
                combatStatus={combatStatus}
                onPlayerSkillSelect={(skillKey) => executeSkill(skillKey, true)}
                playerRelics={playerRelics}
                enemyRelics={enemyRelics}
                playerFirstActionAvailable={!playerFirstActionUsedRef.current}
            />

            {process.env.NODE_ENV !== "production" && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[160]">
                    <button
                        type="button"
                        onClick={handleDevSkip}
                        disabled={combatStatus !== "active"}
                        className={`border px-4 py-2 font-semibold tracking-[0.08em] ${
                            combatStatus === "active"
                                ? "border-red-400 bg-red-950/70 text-red-200 hover:bg-red-900/80"
                                : "border-neutral-700 bg-neutral-900/50 text-neutral-500 cursor-not-allowed"
                        }`}
                    >
                        SKIP
                    </button>
                </div>
            )}

            {/* VS Intro Screen */}
            {showIntro && (
                <div
                    className={`absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center gap-8 cursor-pointer transition-opacity duration-500 ${introFading ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                    onClick={() => {
                        setIntroFading(true);
                        setTimeout(() => setShowIntro(false), 500);
                    }}
                >
                    <div className="text-center">
                        <div className="text-4xl md:text-6xl font-bold tracking-[0.2em] text-white uppercase">{player.name}</div>
                        <div className="text-2xl md:text-3xl font-bold tracking-[0.5em] text-neutral-500 my-4">VS</div>
                        <div className="text-4xl md:text-6xl font-bold tracking-[0.2em] text-red-400 uppercase">{enemy.name}</div>
                    </div>
                    <div className="text-xs text-neutral-600 tracking-[0.25em] uppercase">Tap to skip</div>
                </div>
            )}

            {/* Victory Screen */}
            {victoryData && (
                <div className="absolute inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
                    <div className="w-full max-w-md border-2 border-amber-400/70 bg-neutral-950 text-center p-4 sm:p-8 flex flex-col items-center gap-4 sm:gap-6 overflow-y-auto max-h-[90vh] shadow-[0_0_60px_rgba(251,191,36,0.2)]">
                        <div className="text-xs text-amber-400/80 tracking-[0.4em] uppercase">CONGRATS YOU WON!!</div>
                        <div className="text-4xl md:text-5xl font-bold tracking-[0.15em] text-amber-300">VICTORY</div>
                        <div className="w-full h-px bg-amber-400/30" />
                        <div className="flex flex-wrap gap-4 sm:gap-8 justify-center">
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-2xl font-bold text-amber-200">+{goldReward}g</div>
                                <div className="text-[10px] text-neutral-500 tracking-[0.2em] uppercase">Gold</div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-2xl font-bold text-blue-300">+{xpReward} XP</div>
                                <div className="text-[10px] text-neutral-500 tracking-[0.2em] uppercase">Experience</div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-2xl font-bold text-emerald-300">+12 HP</div>
                                <div className="text-[10px] text-neutral-500 tracking-[0.2em] uppercase">Recovered</div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => onPlayerWin?.(victoryData.player, victoryData.enemy)}
                            className="border border-amber-400/70 px-10 py-3 text-amber-200 hover:bg-amber-900/20 tracking-[0.12em] uppercase text-sm font-semibold transition-colors"
                        >
                            Claim Rewards
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
