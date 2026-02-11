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

export default function Combat({ player, setPlayer, enemy, setEnemy, playerRelics = [], onPlayerLose, onPlayerWin }: CombatProps) {
    const playerKey = player.name.toLowerCase();
    const enemyKey = enemy.name.toLowerCase();

    const playerModelData: ChampionModelData = championsData[playerKey];
    const enemyModelData: ChampionModelData = championsData[enemyKey];

    const [playerModelAnim, setPlayerModelAnim] = useState<AnimationStep[]>(playerModelData.animations.idle);
    const [enemyModelAnim, setEnemyModelAnim] = useState<AnimationStep[]>(enemyModelData.animations.idle);

    const [turn, setTurn] = useState<turn>({ number: 1, playerTurn: true });
    const [combatStatus, setCombatStatus] = useState<CombatStatus>("active");
    const [isResolvingAction, setIsResolvingAction] = useState(false);

    const [playerCooldowns, setPlayerCooldowns] = useState<SkillCooldowns>({ ...EMPTY_COOLDOWNS });
    const [enemyCooldowns, setEnemyCooldowns] = useState<SkillCooldowns>({ ...EMPTY_COOLDOWNS });

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
            onPlayerWin?.(finalPlayer, finalEnemy);
            return;
        }

        setCombatStatus("playerLost");
        if (playerModelData.animations.death) {
            setPlayerModelAnim(playerModelData.animations.death);
        }
        onPlayerLose?.(finalPlayer, finalEnemy);
    }, [clearAllTimeouts, enemyModelData.animations.death, onPlayerLose, onPlayerWin, playerModelData.animations.death]);

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
                attackerRelics: isPlayerActor ? playerRelics : [],
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

            setIsResolvingAction(false);
            isResolvingActionRef.current = false;
            setTurn((prev) => ({ number: prev.number + 1, playerTurn: !prev.playerTurn }));
        }, skill.time);
    }, [
        enemyModelData.animations,
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
            />
        </div>
    );
}
