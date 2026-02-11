'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Combat from "../Combat/combat";
import { createChampion, scaleChampion } from "@/lib/champions";
import MapRow from "./row";
import { prepareChampionForNextEncounter } from "@/lib/utils/combat";
import { applyDirectSkillUpgrade, applyUpgradeOption, generateUpgradeOptions, type UpgradeOption } from "@/lib/utils/upgrades";
import { applyAffixesOnSpawn, rollEnemyAffixes } from "@/lib/utils/affixes";
import { applyRelicOnAcquire, generateRelicOptions, RELIC_DEFS } from "@/lib/utils/relics";
import { applyShopOffer, generateShopOffers, type ShopOffer } from "@/lib/utils/shop";
import { applyEventOption, generateEvent, type RunEvent } from "@/lib/utils/events";

type MapNodeData = {
    id: string;
    row: number;
    order: number;
    kind: MapNodeKind;
};

type MapEdge = {
    from: string;
    to: string;
};

type MapGraph = {
    nodes: MapNodeData[];
    edges: MapEdge[];
};

type PendingOverlay =
    | { kind: "upgrade"; options: UpgradeOption[]; nodeId: string }
    | { kind: "relic"; options: RelicId[]; nodeId: string; source: "elite" | "event" }
    | { kind: "shop"; offers: ShopOffer[]; nodeId: string; seed: number }
    | { kind: "rest"; nodeId: string }
    | { kind: "event"; nodeId: string; seed: number; event: RunEvent }
    | null;

const PLAYER_CHAMPION: ChampionId = "garen";
const ENEMY_POOL: ChampionId[] = ["darius", "garen"];
const SKILL_UPGRADE_KEYS: SkillUpgradeKey[] = ["Q", "W", "E", "R"];

const createRng = (seed: number) => {
    let t = seed >>> 0;
    return () => {
        t += 0x6D2B79F5;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
};

const hashText = (value: string) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash);
};

const pickUniqueIndices = (count: number, picks: number, rng: () => number): number[] => {
    const pool = Array.from({ length: count }, (_, index) => index);
    const selected: number[] = [];

    while (pool.length > 0 && selected.length < picks) {
        const index = Math.floor(rng() * pool.length);
        const [picked] = pool.splice(index, 1);
        if (picked !== undefined) selected.push(picked);
    }

    return selected;
};

const assignNodeKinds = (rowMap: globalThis.Map<number, MapNodeData[]>, seed: number) => {
    const rng = createRng(seed);

    const rowTwo = rowMap.get(2) ?? [];
    const rowTwoSpecials = pickUniqueIndices(rowTwo.length, Math.min(2, rowTwo.length), rng);
    if (rowTwoSpecials[0] !== undefined) rowTwo[rowTwoSpecials[0]].kind = "event";
    if (rowTwoSpecials[1] !== undefined) rowTwo[rowTwoSpecials[1]].kind = "rest";

    const rowThree = rowMap.get(3) ?? [];
    const rowThreeSpecials = pickUniqueIndices(rowThree.length, Math.min(2, rowThree.length), rng);
    if (rowThreeSpecials[0] !== undefined) rowThree[rowThreeSpecials[0]].kind = "shop";
    if (rowThreeSpecials[1] !== undefined) rowThree[rowThreeSpecials[1]].kind = "elite";

    const rowFour = rowMap.get(4) ?? [];
    if (rowFour.length > 0) {
        const eliteIndex = Math.floor(rng() * rowFour.length);
        rowFour[eliteIndex].kind = "elite";

        if (rowFour.length > 1) {
            const secondIndex = eliteIndex === 0 ? 1 : 0;
            rowFour[secondIndex].kind = rng() > 0.5 ? "event" : "rest";
        }
    }
};

const generateEnemyForNode = (node: MapNodeData, seed: number, playerChampionName: string): champion => {
    const pool = ENEMY_POOL.filter((id) => id !== playerChampionName.toLowerCase());
    const enemyPool = pool.length > 0 ? pool : ENEMY_POOL;
    const pick = hashText(`${seed}-${node.id}`) % enemyPool.length;
    const baseEnemy = createChampion(enemyPool[pick]);

    const rowScale = 1 + node.row * 0.08;
    const bossBonus = node.kind === "boss" ? 0.2 : 0;
    const scaledEnemy = scaleChampion(baseEnemy, rowScale + bossBonus);

    const affixes = rollEnemyAffixes({
        nodeKind: node.kind,
        seed: hashText(`${seed}-${node.id}-affixes`),
    });

    return applyAffixesOnSpawn(scaledEnemy, affixes);
};

const buildGraphCandidate = (seed: number): MapGraph => {
    const rng = createRng(seed);
    const rowWidths = [7, 5, 3, 2, 1];
    const nodes: MapNodeData[] = [];
    const edges: MapEdge[] = [];

    let nodeCounter = 1;
    for (let rowIndex = 0; rowIndex < rowWidths.length; rowIndex += 1) {
        const row = rowIndex + 1;
        const width = rowWidths[rowIndex];
        for (let order = 1; order <= width; order += 1) {
            const isBoss = rowIndex === rowWidths.length - 1;
            const id = isBoss ? "boss" : `n${nodeCounter}`;
            nodes.push({ id, row, order, kind: isBoss ? "boss" : "combat" });
            if (!isBoss) nodeCounter += 1;
        }
    }

    const rowMap = new globalThis.Map<number, MapNodeData[]>();
    for (const node of nodes) {
        if (!rowMap.has(node.row)) rowMap.set(node.row, []);
        rowMap.get(node.row)?.push(node);
    }

    for (const list of rowMap.values()) {
        list.sort((a, b) => a.order - b.order);
    }

    assignNodeKinds(rowMap, seed + 113);

    const rowCount = rowWidths.length;
    const startTargets = rowMap.get(1) || [];
    for (const node of startTargets) {
        edges.push({ from: "start", to: node.id });
    }

    for (let row = 1; row < rowCount; row += 1) {
        const currentRow = rowMap.get(row) || [];
        const nextRow = rowMap.get(row + 1) || [];
        const incoming = new globalThis.Map<string, number>();

        for (const node of nextRow) {
            incoming.set(node.id, 0);
        }

        for (const node of currentRow) {
            const maxConnections = Math.min(2, nextRow.length);
            const connections = maxConnections === 1 ? 1 : 1 + (rng() > 0.6 ? 1 : 0);
            const targets = new Set<string>();

            let attempts = 0;
            while (targets.size < connections && attempts < 30) {
                const target = nextRow[Math.floor(rng() * nextRow.length)];
                if (target) targets.add(target.id);
                attempts += 1;
            }

            if (targets.size === 0 && nextRow.length > 0) {
                const fallbackTarget = nextRow[Math.floor(rng() * nextRow.length)];
                if (fallbackTarget) targets.add(fallbackTarget.id);
            }

            for (const targetId of targets) {
                edges.push({ from: node.id, to: targetId });
                incoming.set(targetId, (incoming.get(targetId) || 0) + 1);
            }
        }

        for (const [targetId, count] of incoming.entries()) {
            if (count > 0) continue;
            const fallback = currentRow[Math.floor(rng() * currentRow.length)];
            if (fallback) edges.push({ from: fallback.id, to: targetId });
        }
    }

    return { nodes, edges };
};

const graphHasPathToBossFromEveryNode = (graph: MapGraph) => {
    const adjacency = new globalThis.Map<string, string[]>();
    for (const edge of graph.edges) {
        if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
        adjacency.get(edge.from)?.push(edge.to);
    }

    const memo = new globalThis.Map<string, boolean>();
    const visiting = new Set<string>();
    const canReachBoss = (nodeId: string): boolean => {
        if (nodeId === "boss") return true;
        if (memo.has(nodeId)) return memo.get(nodeId) ?? false;
        if (visiting.has(nodeId)) return false;

        visiting.add(nodeId);
        const targets = adjacency.get(nodeId) ?? [];
        const reaches = targets.some((targetId) => canReachBoss(targetId));
        visiting.delete(nodeId);
        memo.set(nodeId, reaches);
        return reaches;
    };

    if (!canReachBoss("start")) return false;
    return graph.nodes.every((node) => canReachBoss(node.id));
};

const buildGraph = (seed: number): MapGraph => {
    const MAX_ATTEMPTS = 20;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const candidateSeed = seed + attempt * 7919;
        const candidate = buildGraphCandidate(candidateSeed);
        if (graphHasPathToBossFromEveryNode(candidate)) return candidate;
    }

    return buildGraphCandidate(seed);
};

export default function MapView() {
    const [currentNodeId, setCurrentNodeId] = useState("start");
    const [mapSeed, setMapSeed] = useState(1);
    const [player, setPlayer] = useState<champion>(() => createChampion(PLAYER_CHAMPION));
    const [enemy, setEnemy] = useState<champion>(() => createChampion("darius"));
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [completedNodeIds, setCompletedNodeIds] = useState<Set<string>>(() => new Set());
    const [pendingOverlay, setPendingOverlay] = useState<PendingOverlay>(null);
    const [runWon, setRunWon] = useState(false);
    const [gold, setGold] = useState(20);
    const [relics, setRelics] = useState<RelicId[]>([]);
    const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
    const graphRef = useRef<HTMLDivElement>(null);
    const linesSvgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        setMapSeed(Date.now());
    }, []);

    const { rows, nodeById, edgesByFrom, edges } = useMemo(() => {
        const { nodes, edges } = buildGraph(mapSeed);

        const rowMap = new globalThis.Map<number, MapNodeData[]>();
        const nodeMap = new globalThis.Map<string, MapNodeData>();

        for (const node of nodes) {
            nodeMap.set(node.id, node);
            if (!rowMap.has(node.row)) {
                rowMap.set(node.row, []);
            }
            rowMap.get(node.row)?.push(node);
        }

        for (const list of rowMap.values()) {
            list.sort((a, b) => a.order - b.order);
        }

        const orderedRows = Array.from(rowMap.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([, list]) => list);

        const nextByFrom = new globalThis.Map<string, Set<string>>();
        for (const edge of edges) {
            if (!nextByFrom.has(edge.from)) {
                nextByFrom.set(edge.from, new Set());
            }
            nextByFrom.get(edge.from)?.add(edge.to);
        }

        nodeMap.set("start", { id: "start", row: 0, order: 0, kind: "combat" });

        return { rows: orderedRows, nodeById: nodeMap, edgesByFrom: nextByFrom, edges };
    }, [mapSeed]);

    const recalculateNodePositions = useCallback(() => {
        const graphElement = graphRef.current;
        const svgElement = linesSvgRef.current;
        if (!graphElement || !svgElement) return;

        const svgRect = svgElement.getBoundingClientRect();
        if (svgRect.width <= 0 || svgRect.height <= 0) return;

        const nextPositions: Record<string, { x: number; y: number }> = {};
        const nodeElements = graphElement.querySelectorAll<HTMLElement>("[data-map-node-id]");

        for (const nodeElement of nodeElements) {
            const nodeId = nodeElement.dataset.mapNodeId;
            if (!nodeId) continue;

            const rect = nodeElement.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            nextPositions[nodeId] = {
                x: centerX - svgRect.left,
                y: centerY - svgRect.top,
            };
        }

        setNodePositions(nextPositions);
    }, []);

    useEffect(() => {
        recalculateNodePositions();
        const rafId = requestAnimationFrame(recalculateNodePositions);
        const graphElement = graphRef.current;

        const resizeObserver = typeof ResizeObserver !== "undefined" && graphElement
            ? new ResizeObserver(() => {
                recalculateNodePositions();
            })
            : null;

        if (graphElement && resizeObserver) {
            resizeObserver.observe(graphElement);
        }

        const onWindowResize = () => recalculateNodePositions();
        window.addEventListener("resize", onWindowResize);

        return () => {
            cancelAnimationFrame(rafId);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", onWindowResize);
        };
    }, [recalculateNodePositions, rows, pendingOverlay, currentNodeId, runWon]);

    const completeNode = (nodeId: string) => {
        setCurrentNodeId(nodeId);
        setCompletedNodeIds((prev) => {
            const next = new Set(prev);
            next.add(nodeId);
            return next;
        });
    };

    const canSelectNode = (nodeId: string) => {
        if (activeNodeId || pendingOverlay || runWon) return false;

        const currentNode = nodeById.get(currentNodeId);
        const nextRow = currentNode ? currentNode.row + 1 : 1;
        const candidate = nodeById.get(nodeId);
        if (!candidate || candidate.row !== nextRow) return false;

        const allowed = edgesByFrom.get(currentNodeId);
        return !!allowed?.has(nodeId);
    };

    const restartMap = () => {
        setCurrentNodeId("start");
        setMapSeed(Date.now());
        setPlayer(createChampion(PLAYER_CHAMPION));
        setEnemy(createChampion("darius"));
        setActiveNodeId(null);
        setCompletedNodeIds(new Set());
        setPendingOverlay(null);
        setRunWon(false);
        setGold(20);
        setRelics([]);
    };

    const onSelectNode = (nodeId: string) => {
        if (!canSelectNode(nodeId)) return;

        const selectedNode = nodeById.get(nodeId);
        if (!selectedNode) return;

        if (selectedNode.kind === "combat" || selectedNode.kind === "elite" || selectedNode.kind === "boss") {
            setEnemy(generateEnemyForNode(selectedNode, mapSeed, player.name));
            setActiveNodeId(nodeId);
            return;
        }

        if (selectedNode.kind === "rest") {
            setPendingOverlay({ kind: "rest", nodeId });
            return;
        }

        if (selectedNode.kind === "shop") {
            const seed = hashText(`${mapSeed}-${nodeId}-shop`);
            setPendingOverlay({
                kind: "shop",
                nodeId,
                seed,
                offers: generateShopOffers(seed, player, relics),
            });
            return;
        }

        const seed = hashText(`${mapSeed}-${nodeId}-event`);
        setPendingOverlay({
            kind: "event",
            nodeId,
            seed,
            event: generateEvent(seed),
        });
    };

    const handleCombatWin = (updatedPlayer: champion) => {
        if (!activeNodeId) return;

        const wonNode = nodeById.get(activeNodeId);
        if (!wonNode) return;

        const preparedPlayer = prepareChampionForNextEncounter(updatedPlayer);
        const healedPlayer = {
            ...preparedPlayer,
            currentHealth: Math.min(preparedPlayer.maxHealth, preparedPlayer.currentHealth + 12),
        };

        setPlayer(healedPlayer);
        completeNode(activeNodeId);

        const goldReward = wonNode.kind === "elite" ? 45 : wonNode.kind === "combat" ? 25 : 0;
        if (goldReward > 0) {
            setGold((prev) => prev + goldReward);
        }

        if (wonNode.kind === "boss") {
            setRunWon(true);
            setPendingOverlay(null);
        } else if (wonNode.kind === "elite") {
            const relicSeed = hashText(`${mapSeed}-${activeNodeId}-elite-relic-${completedNodeIds.size + 1}`);
            setPendingOverlay({
                kind: "relic",
                options: generateRelicOptions(relicSeed, relics),
                nodeId: activeNodeId,
                source: "elite",
            });
        } else {
            const upgradeSeed = hashText(`${mapSeed}-${activeNodeId}-upgrade-${completedNodeIds.size + 1}`);
            setPendingOverlay({
                kind: "upgrade",
                options: generateUpgradeOptions(upgradeSeed),
                nodeId: activeNodeId,
            });
        }

        setActiveNodeId(null);
    };

    const handleCombatLose = () => {
        restartMap();
    };

    const onSelectUpgrade = (option: UpgradeOption) => {
        setPlayer((prev) => applyUpgradeOption(prev, option));
        setPendingOverlay(null);
    };

    const onSelectRelic = (relicId: RelicId) => {
        if (!pendingOverlay || pendingOverlay.kind !== "relic") return;

        const alreadyOwned = relics.includes(relicId);
        if (!alreadyOwned) {
            setPlayer((prev) => applyRelicOnAcquire(prev, relicId));
            setRelics((prev) => [...prev, relicId]);
        }

        if (pendingOverlay.source === "event") {
            completeNode(pendingOverlay.nodeId);
        }

        setPendingOverlay(null);
    };

    const onRestRecover = () => {
        if (!pendingOverlay || pendingOverlay.kind !== "rest") return;

        setPlayer((prev) => ({
            ...prev,
            currentHealth: Math.min(prev.maxHealth, prev.currentHealth + Math.round(prev.maxHealth * 0.35)),
        }));

        completeNode(pendingOverlay.nodeId);
        setPendingOverlay(null);
    };

    const onRestTrain = () => {
        if (!pendingOverlay || pendingOverlay.kind !== "rest") return;

        const seed = hashText(`${mapSeed}-${pendingOverlay.nodeId}-rest-train-${completedNodeIds.size}`);
        const rng = createRng(seed);
        const pickedSkill = SKILL_UPGRADE_KEYS[Math.floor(rng() * SKILL_UPGRADE_KEYS.length)] ?? "Q";

        setPlayer((prev) => applyDirectSkillUpgrade(prev, pickedSkill));
        completeNode(pendingOverlay.nodeId);
        setPendingOverlay(null);
    };

    const onShopBuy = (offer: ShopOffer) => {
        if (!pendingOverlay || pendingOverlay.kind !== "shop") return;
        if (gold < offer.cost) return;

        const result = applyShopOffer(player, relics, offer);
        setPlayer(result.player);
        setRelics(result.relics);
        setGold((prev) => prev - offer.cost);

        setPendingOverlay((prev) => {
            if (!prev || prev.kind !== "shop") return prev;
            return {
                ...prev,
                offers: prev.offers.filter((item) => item.id !== offer.id),
            };
        });
    };

    const onShopReroll = () => {
        if (!pendingOverlay || pendingOverlay.kind !== "shop") return;
        if (gold < 15) return;

        const nextSeed = pendingOverlay.seed + 97;
        setGold((prev) => prev - 15);
        setPendingOverlay({
            ...pendingOverlay,
            seed: nextSeed,
            offers: generateShopOffers(nextSeed, player, relics),
        });
    };

    const onShopLeave = () => {
        if (!pendingOverlay || pendingOverlay.kind !== "shop") return;
        completeNode(pendingOverlay.nodeId);
        setPendingOverlay(null);
    };

    const onEventOption = (optionId: string) => {
        if (!pendingOverlay || pendingOverlay.kind !== "event") return;

        const result = applyEventOption({
            optionId,
            player,
            gold,
            relics,
            seed: hashText(`${pendingOverlay.seed}-${optionId}-${completedNodeIds.size}`),
        });

        setPlayer(result.player);
        setGold(result.gold);
        setRelics(result.relics);

        if (result.relicOptions && result.relicOptions.length > 0) {
            setPendingOverlay({
                kind: "relic",
                options: result.relicOptions,
                nodeId: pendingOverlay.nodeId,
                source: "event",
            });
            return;
        }

        completeNode(pendingOverlay.nodeId);
        setPendingOverlay(null);
    };

    const currentLabel = currentNodeId === "start" ? "START" : currentNodeId.toUpperCase();

    if (activeNodeId) {
        return (
            <div className="h-screen w-screen overflow-hidden">
                <Combat
                    key={`${mapSeed}-${activeNodeId}`}
                    player={player}
                    setPlayer={setPlayer}
                    enemy={enemy}
                    setEnemy={setEnemy}
                    playerRelics={relics}
                    onPlayerWin={handleCombatWin}
                    onPlayerLose={handleCombatLose}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col place-content-center place-items-center w-full h-full border gap-y-4 p-3">
            <div className="w-full flex flex-wrap items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={restartMap}
                    className="border px-3 py-1 bg-neutral-900 hover:bg-neutral-800"
                >
                    Restart Map
                </button>
                <div className="border px-3 py-1">Current Node: {currentLabel}</div>
                <div className="border px-3 py-1">HP: {player.currentHealth}/{player.maxHealth}</div>
                <div className="border px-3 py-1">Gold: {gold}</div>
                <div className="border px-3 py-1">Relics: {relics.length}</div>
                {runWon && <div className="border px-3 py-1 bg-green-900/60">Boss defeated</div>}
            </div>

            {relics.length > 0 && (
                <div className="w-full max-w-5xl border p-2 text-sm">
                    <span className="font-bold">Relics:</span> {relics.map((id) => RELIC_DEFS[id].label).join(", ")}
                </div>
            )}

            <div className="flex flex-col gap-y-20">
                {pendingOverlay?.kind === "upgrade" && (
                    <div className="border-2 border-yellow-500 bg-neutral-900/90 p-4 flex flex-col gap-3">
                        <div className="text-center text-lg text-yellow-300">Victory Reward: choose one upgrade</div>
                        <div className="text-center text-sm text-green-300">You recovered +12 HP from this win.</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {pendingOverlay.options.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => onSelectUpgrade(option)}
                                    className="border border-yellow-500 hover:bg-yellow-900/30 px-3 py-3 text-left"
                                >
                                    <div className="font-bold text-yellow-300">{option.label}</div>
                                    <div className="text-sm">{option.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {pendingOverlay?.kind === "relic" && (
                    <div className="border-2 border-indigo-500 bg-neutral-900/90 p-4 flex flex-col gap-3">
                        <div className="text-center text-lg text-indigo-300">Choose one relic</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {pendingOverlay.options.map((relicId) => (
                                <button
                                    key={relicId}
                                    type="button"
                                    onClick={() => onSelectRelic(relicId)}
                                    className="border border-indigo-500 hover:bg-indigo-900/30 px-3 py-3 text-left"
                                >
                                    <div className="font-bold text-indigo-300">{RELIC_DEFS[relicId].label}</div>
                                    <div className="text-sm">{RELIC_DEFS[relicId].description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {pendingOverlay?.kind === "rest" && (
                    <div className="border-2 border-emerald-500 bg-neutral-900/90 p-4 flex flex-col gap-3 max-w-2xl">
                        <div className="text-center text-lg text-emerald-300">Campfire Rest</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={onRestRecover}
                                className="border border-emerald-500 hover:bg-emerald-900/30 px-3 py-3 text-left"
                            >
                                <div className="font-bold text-emerald-300">Recover</div>
                                <div className="text-sm">Heal 35% max HP</div>
                            </button>
                            <button
                                type="button"
                                onClick={onRestTrain}
                                className="border border-emerald-500 hover:bg-emerald-900/30 px-3 py-3 text-left"
                            >
                                <div className="font-bold text-emerald-300">Train</div>
                                <div className="text-sm">Gain +1 random skill upgrade</div>
                            </button>
                        </div>
                    </div>
                )}

                {pendingOverlay?.kind === "shop" && (
                    <div className="border-2 border-cyan-500 bg-neutral-900/90 p-4 flex flex-col gap-3 max-w-5xl">
                        <div className="text-center text-lg text-cyan-300">Shop</div>
                        <div className="text-center text-sm">Gold: {gold}</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {pendingOverlay.offers.map((offer) => {
                                const affordable = gold >= offer.cost;
                                return (
                                    <button
                                        key={offer.id}
                                        type="button"
                                        onClick={() => onShopBuy(offer)}
                                        disabled={!affordable}
                                        className={`border px-3 py-3 text-left ${
                                            affordable
                                                ? "border-cyan-500 hover:bg-cyan-900/30"
                                                : "border-neutral-700 opacity-60 cursor-not-allowed"
                                        }`}
                                    >
                                        <div className="font-bold text-cyan-300">{offer.label}</div>
                                        <div className="text-sm">{offer.description}</div>
                                        <div className="text-xs mt-2">Cost: {offer.cost}g</div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button
                                type="button"
                                onClick={onShopReroll}
                                disabled={gold < 15}
                                className={`border px-3 py-2 ${gold >= 15 ? "border-cyan-500 hover:bg-cyan-900/30" : "opacity-60 cursor-not-allowed"}`}
                            >
                                Reroll (15g)
                            </button>
                            <button
                                type="button"
                                onClick={onShopLeave}
                                className="border border-cyan-500 px-3 py-2 hover:bg-cyan-900/30"
                            >
                                Leave Shop
                            </button>
                        </div>
                    </div>
                )}

                {pendingOverlay?.kind === "event" && (
                    <div className="border-2 border-fuchsia-500 bg-neutral-900/90 p-4 flex flex-col gap-3 max-w-4xl">
                        <div className="text-center text-lg text-fuchsia-300">{pendingOverlay.event.title}</div>
                        <div className="text-center text-sm">{pendingOverlay.event.description}</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {pendingOverlay.event.options.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => onEventOption(option.id)}
                                    className="border border-fuchsia-500 hover:bg-fuchsia-900/30 px-3 py-3 text-left"
                                >
                                    <div className="font-bold text-fuchsia-300">{option.label}</div>
                                    <div className="text-sm">{option.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div ref={graphRef} className="relative w-[95vw] max-w-6xl min-h-[560px] border rounded-md bg-neutral-950/30 overflow-hidden">
                    <svg ref={linesSvgRef} className="absolute inset-0 w-full h-full pointer-events-none">
                        {edges.map((edge) => {
                            const from = nodePositions[edge.from];
                            const to = nodePositions[edge.to];
                            if (!from || !to) return null;

                            const isPathFromCurrent = edge.from === currentNodeId;
                            const isCompletedPath = completedNodeIds.has(edge.from) && completedNodeIds.has(edge.to);

                            return (
                                <line
                                    key={`${edge.from}-${edge.to}`}
                                    x1={from.x}
                                    y1={from.y}
                                    x2={to.x}
                                    y2={to.y}
                                    stroke={isCompletedPath ? "#34d399" : isPathFromCurrent ? "#facc15" : "#6b7280"}
                                    strokeWidth={isPathFromCurrent ? 0.65 : 0.45}
                                    strokeOpacity={isPathFromCurrent ? 0.9 : 0.55}
                                />
                            );
                        })}
                    </svg>

                    <div className="relative z-10 flex flex-col gap-y-20 py-6">
                        {rows.map((rowNodes, index) => (
                            <MapRow
                                key={index}
                                nodes={rowNodes}
                                currentNodeId={currentNodeId}
                                activeNodeId={activeNodeId}
                                completedNodeIds={completedNodeIds}
                                isLocked={runWon}
                                canSelectNode={canSelectNode}
                                onSelectNode={onSelectNode}
                            />
                        ))}
                        <div className="place-self-center">
                            <div
                                data-map-node-id="start"
                                className={`border rounded px-2 py-1 font-bold ${currentNodeId === "start" ? "bg-emerald-900/70" : ""}`}
                            >
                                START
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
