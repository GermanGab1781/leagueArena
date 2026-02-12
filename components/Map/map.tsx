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
const ALL_RELIC_IDS = Object.keys(RELIC_DEFS) as RelicId[];

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

const rollEnemyRelicsForNode = (node: MapNodeData, seed: number): RelicId[] => {
    const rng = createRng(hashText(`${seed}-${node.id}-enemy-relics`));
    let relicCount = 0;

    if (node.kind === "boss") {
        relicCount = 2 + (rng() > 0.58 ? 1 : 0);
    } else if (node.kind === "elite") {
        relicCount = 1 + (node.row >= 4 && rng() > 0.52 ? 1 : 0);
    } else if (node.kind === "combat") {
        const chance = node.row >= 4 ? 0.52 : node.row >= 3 ? 0.32 : 0.14;
        relicCount = rng() < chance ? 1 : 0;
    }

    if (relicCount <= 0) return [];

    const pool = [...ALL_RELIC_IDS];
    const picked: RelicId[] = [];
    while (pool.length > 0 && picked.length < relicCount) {
        const index = Math.floor(rng() * pool.length);
        const [relicId] = pool.splice(index, 1);
        if (relicId) picked.push(relicId);
    }

    return picked;
};

const generateEnemyForNode = (
    node: MapNodeData,
    seed: number,
    playerChampionName: string,
): { enemy: champion; relics: RelicId[] } => {
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
    const enemyWithAffixes = applyAffixesOnSpawn(scaledEnemy, affixes);
    const relics = rollEnemyRelicsForNode(node, seed);
    const enemyWithRelics = relics.reduce((currentEnemy, relicId) => applyRelicOnAcquire(currentEnemy, relicId), enemyWithAffixes);

    return { enemy: enemyWithRelics, relics };
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
        if (currentRow.length === 0 || nextRow.length === 0) continue;

        const incoming = new globalThis.Map<string, number>();
        const rowEdgeSet = new Set<string>();
        for (const node of nextRow) {
            incoming.set(node.id, 0);
        }

        const addEdge = (fromId: string, toId: string) => {
            const edgeKey = `${fromId}->${toId}`;
            if (rowEdgeSet.has(edgeKey)) return;

            rowEdgeSet.add(edgeKey);
            edges.push({ from: fromId, to: toId });
            incoming.set(toId, (incoming.get(toId) || 0) + 1);
        };

        for (let currentIndex = 0; currentIndex < currentRow.length; currentIndex += 1) {
            const fromNode = currentRow[currentIndex];
            const primaryTargetIndex =
                currentRow.length === 1
                    ? Math.floor((nextRow.length - 1) / 2)
                    : Math.round((currentIndex * (nextRow.length - 1)) / (currentRow.length - 1));

            addEdge(fromNode.id, nextRow[primaryTargetIndex].id);

            const shouldAddAdjacentBranch = nextRow.length > 1 && rng() > 0.74;
            if (!shouldAddAdjacentBranch) continue;

            const branchDirection = rng() > 0.5 ? 1 : -1;
            const secondaryTargetIndex = Math.min(
                nextRow.length - 1,
                Math.max(0, primaryTargetIndex + branchDirection),
            );

            if (secondaryTargetIndex !== primaryTargetIndex) {
                addEdge(fromNode.id, nextRow[secondaryTargetIndex].id);
            }
        }

        for (let targetIndex = 0; targetIndex < nextRow.length; targetIndex += 1) {
            const targetNode = nextRow[targetIndex];
            if ((incoming.get(targetNode.id) || 0) > 0) continue;

            const fallbackSourceIndex =
                nextRow.length === 1
                    ? Math.floor((currentRow.length - 1) / 2)
                    : Math.round((targetIndex * (currentRow.length - 1)) / (nextRow.length - 1));

            addEdge(currentRow[fallbackSourceIndex].id, targetNode.id);
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
    const [enemyRelics, setEnemyRelics] = useState<RelicId[]>([]);
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
        setEnemyRelics([]);
    };

    const onSelectNode = (nodeId: string) => {
        if (!canSelectNode(nodeId)) return;

        const selectedNode = nodeById.get(nodeId);
        if (!selectedNode) return;

        if (selectedNode.kind === "combat" || selectedNode.kind === "elite" || selectedNode.kind === "boss") {
            const generated = generateEnemyForNode(selectedNode, mapSeed, player.name);
            setEnemy(generated.enemy);
            setEnemyRelics(generated.relics);
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
    const reachableNodeIds = useMemo(() => {
        const reachable = new Set<string>();
        const stack: string[] = [currentNodeId];

        while (stack.length > 0) {
            const nodeId = stack.pop();
            if (!nodeId || reachable.has(nodeId)) continue;

            reachable.add(nodeId);
            const nextNodes = edgesByFrom.get(nodeId);
            if (!nextNodes) continue;

            for (const nextNodeId of nextNodes) {
                if (!reachable.has(nextNodeId)) {
                    stack.push(nextNodeId);
                }
            }
        }

        return reachable;
    }, [currentNodeId, edgesByFrom]);

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
                    enemyRelics={enemyRelics}
                    onPlayerWin={handleCombatWin}
                    onPlayerLose={handleCombatLose}
                />
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen overflow-y-auto px-3 py-3">
            <div className="mx-auto w-full max-w-6xl flex flex-col items-center gap-y-3">
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

                <div className="w-full flex flex-col items-center gap-y-6 md:gap-y-10">
                {pendingOverlay?.kind === "upgrade" && (
                    <div className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-4">
                        <div className="w-full max-w-6xl min-h-[74vh] border-2 border-amber-300/70 bg-[radial-gradient(ellipse_at_top,#2b2012,#1a120b_55%,#120b06)] text-amber-100 p-4 md:p-8 grid grid-rows-[auto_1fr_auto] gap-6 shadow-[0_0_40px_rgba(251,191,36,0.18)]">
                            <pre className="font-mono text-[10px] md:text-xs text-amber-200/90 leading-tight text-center whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------+
|   __      __  _____   _____   _______   ____   _____   __   __                  |
|   \\ \\    / / |_   _| / ____| |__   __| / __ \\ |  __ \\  \\ \\ / /                  |
|    \\ \\  / /    | |  | |         | |   | |  | || |__) |  \\ V /                   |
|     \\ \\/ /     | |  | |         | |   | |  | ||  _  /    > <                    |
|      \\  /     _| |_ | |____     | |   | |__| || | \\ \\   / . \\                   |
|       \\/     |_____| \\_____|    |_|    \\____/ |_|  \\_\\ /_/ \\_\\                  |
|                                                                                  |
|                         R E W A R D   C H A R T E R                              |
+----------------------------------------------------------------------------------+`}
                            </pre>

                            <div className="flex flex-col items-center justify-center gap-5">
                                <div className="text-center text-2xl md:text-4xl tracking-[0.16em] text-amber-200">CHOOSE YOUR BOON</div>
                                <div className="text-center text-sm md:text-base text-emerald-300">Recovered +12 HP from victory.</div>

                                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
                                    {pendingOverlay.options.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => onSelectUpgrade(option)}
                                            className="min-h-[150px] border border-amber-300/70 bg-black/20 hover:bg-amber-900/25 px-5 py-5 text-left transition-colors"
                                        >
                                            <div className="font-bold text-amber-200 text-xl tracking-wide">{option.label}</div>
                                            <div className="text-sm md:text-base text-amber-100/90 mt-2">{option.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <pre className="font-mono text-[10px] md:text-xs text-amber-200/85 leading-tight text-center whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------+
|  [SEAL] \"Steel remembers. Will decides. Choose and advance to the next trial.\" |
+----------------------------------------------------------------------------------+`}
                            </pre>
                        </div>
                    </div>
                )}

                {pendingOverlay?.kind === "relic" && (
                    <div className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-4">
                        <div className="w-full max-w-6xl min-h-[74vh] border-2 border-violet-300/70 bg-[radial-gradient(ellipse_at_top,#24163f,#151028_56%,#0b0814)] text-violet-100 p-4 md:p-8 grid grid-rows-[auto_1fr_auto] gap-6 shadow-[0_0_40px_rgba(167,139,250,0.2)]">
                            <pre className="font-mono text-[10px] md:text-xs text-violet-200/90 leading-tight text-center whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------+
|  _____   ______  _      _____   _____    _____   _____   _    _   _____          |
| |  __ \\ |  ____|| |    |_   _| / ____|  / ____| / ____| | |  | | / ____|         |
| | |__) || |__   | |      | |  | |      | |     | |  __  | |__| || |              |
| |  _  / |  __|  | |      | |  | |      | |     | | |_ | |  __  || |              |
| | | \\ \\ | |____ | |____ _| |_ | |____  | |____ | |__| | | |  | || |____          |
| |_|  \\_\\|______||______|_____| \\_____|  \\_____| \\_____| |_|  |_| \\_____|         |
|                                                                                  |
|                           A R C A N E   R E L I C S                              |
+----------------------------------------------------------------------------------+`}
                            </pre>

                            <div className="flex flex-col items-center justify-center gap-5">
                                <div className="text-center text-2xl md:text-4xl tracking-[0.16em] text-violet-200">CHOOSE ONE RELIC</div>
                                <div className="text-center text-sm md:text-base text-violet-300">
                                    {pendingOverlay.source === "elite" ? "Elite trophy recovered." : "Event reward discovered."}
                                </div>

                                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
                                    {pendingOverlay.options.map((relicId) => (
                                        <button
                                            key={relicId}
                                            type="button"
                                            onClick={() => onSelectRelic(relicId)}
                                            className="min-h-[150px] border border-violet-300/70 bg-black/20 hover:bg-violet-900/25 px-5 py-5 text-left transition-colors"
                                        >
                                            <div className="font-bold text-violet-200 text-xl tracking-wide">{RELIC_DEFS[relicId].label}</div>
                                            <div className="text-sm md:text-base text-violet-100/90 mt-2">{RELIC_DEFS[relicId].description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <pre className="font-mono text-[10px] md:text-xs text-violet-200/85 leading-tight text-center whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------+
|        "Power kept is weight carried. Choose what burden you can wield."        |
+----------------------------------------------------------------------------------+`}
                            </pre>
                        </div>
                    </div>
                )}

                {pendingOverlay?.kind === "rest" && (
                    <div className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-4">
                        <div className="w-full max-w-6xl min-h-[74vh] border-2 border-emerald-300/70 bg-[radial-gradient(ellipse_at_top,#123326,#0d231a_56%,#08140f)] text-emerald-100 p-4 md:p-8 grid grid-rows-[auto_1fr_auto] gap-6 shadow-[0_0_40px_rgba(74,222,128,0.2)]">
                            <pre className="font-mono text-[10px] md:text-xs text-emerald-200/90 leading-tight text-center whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------+
|   _____     __  __   ____   ______   ______   _____   _____   ______             |
|  / ____|   / / / /  / __ \\ |  ____| |  ____| |_   _| |  __ \\ |  ____|            |
| | |       / /_/ /  | |  | || |__    | |__      | |   | |__) || |__               |
| | |      |  _  |   | |  | ||  __|   |  __|     | |   |  _  / |  __|              |
| | |____  | | | |   | |__| || |      | |       _| |_  | | \\ \\ | |____             |
|  \\_____| |_| |_|    \\____/ |_|      |_|      |_____| |_|  \\_\\|______|            |
|                                                                                  |
|                             C A M P F I R E   R E S T                            |
+----------------------------------------------------------------------------------+`}
                            </pre>

                            <div className="flex flex-col items-center justify-center gap-5">
                                <div className="text-center text-2xl md:text-4xl tracking-[0.16em] text-emerald-200">CHOOSE YOUR REST</div>
                                <div className="text-center text-sm md:text-base text-emerald-300">
                                    Restore yourself or refine your combat discipline.
                                </div>

                                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <button
                                        type="button"
                                        onClick={onRestRecover}
                                        className="min-h-[150px] border border-emerald-300/70 bg-black/20 hover:bg-emerald-900/25 px-5 py-5 text-left transition-colors"
                                    >
                                        <div className="font-bold text-emerald-200 text-xl tracking-wide">Recover</div>
                                        <div className="text-sm md:text-base text-emerald-100/90 mt-2">Heal 35% of max HP.</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onRestTrain}
                                        className="min-h-[150px] border border-emerald-300/70 bg-black/20 hover:bg-emerald-900/25 px-5 py-5 text-left transition-colors"
                                    >
                                        <div className="font-bold text-emerald-200 text-xl tracking-wide">Train</div>
                                        <div className="text-sm md:text-base text-emerald-100/90 mt-2">Gain +1 random skill upgrade.</div>
                                    </button>
                                </div>
                            </div>

                            <pre className="font-mono text-[10px] md:text-xs text-emerald-200/85 leading-tight text-center whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------+
|         "Flame mends steel, but only intent decides what it becomes."           |
+----------------------------------------------------------------------------------+`}
                            </pre>
                        </div>
                    </div>
                )}

                {pendingOverlay?.kind === "shop" && (
                    <div className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-4">
                        <div className="w-full max-w-6xl min-h-[74vh] border-2 border-cyan-300/70 bg-[radial-gradient(ellipse_at_top,#10223a,#0a1424_56%,#060b13)] text-cyan-100 p-4 md:p-8 grid grid-rows-[auto_1fr_auto] gap-6 shadow-[0_0_40px_rgba(34,211,238,0.2)]">
                            <pre className="font-mono text-[10px] md:text-xs text-cyan-200/90 leading-tight text-center whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------+
|   __  __  ______  _____   _____  _    _          _   _  _______                  |
|  |  \\/  ||  ____||  __ \\ / ____|| |  | |   /\\   | \\ | ||__   __|                 |
|  | \\  / || |__   | |__) | |     | |__| |  /  \\  |  \\| |   | |                    |
|  | |\\/| ||  __|  |  _  /| |     |  __  | / /\\ \\ | . \` |   | |                    |
|  | |  | || |____ | | \\ \\| |____ | |  | |/ ____ \\| |\\  |   | |                    |
|  |_|  |_||______||_|  \\_\\\\_____||_|  |_/_/    \\_\\_| \\_|   |_|                    |
|                                                                                  |
|                           T R A V E L E R ' S   S H O P                          |
+----------------------------------------------------------------------------------+`}
                            </pre>

                            <div className="flex flex-col items-center justify-center gap-5">
                                <div className="text-center text-2xl md:text-4xl tracking-[0.16em] text-cyan-200">SELECT AN OFFER</div>
                                <div className="text-center text-sm md:text-base text-cyan-300">Gold: {gold} | Reroll cost: 15</div>

                                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
                                    {pendingOverlay.offers.length > 0 ? pendingOverlay.offers.map((offer) => {
                                        const affordable = gold >= offer.cost;
                                        return (
                                            <button
                                                key={offer.id}
                                                type="button"
                                                onClick={() => onShopBuy(offer)}
                                                disabled={!affordable}
                                                className={`min-h-[150px] border px-5 py-5 text-left transition-colors ${
                                                    affordable
                                                        ? "border-cyan-300/70 bg-black/20 hover:bg-cyan-900/25"
                                                        : "border-neutral-700/80 bg-black/10 opacity-55 cursor-not-allowed"
                                                }`}
                                            >
                                                <div className="font-bold text-cyan-200 text-xl tracking-wide">{offer.label}</div>
                                                <div className="text-sm md:text-base text-cyan-100/90 mt-2">{offer.description}</div>
                                                <div className="text-xs md:text-sm text-cyan-300/90 mt-4">Cost: {offer.cost}g</div>
                                            </button>
                                        );
                                    }) : (
                                        <div className="md:col-span-3 border border-cyan-300/40 bg-black/20 px-5 py-8 text-center text-cyan-200/80">
                                            No offers left. You can reroll or leave.
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 justify-center">
                                    <button
                                        type="button"
                                        onClick={onShopReroll}
                                        disabled={gold < 15}
                                        className={`border px-4 py-2 ${
                                            gold >= 15
                                                ? "border-cyan-300/70 hover:bg-cyan-900/25"
                                                : "border-neutral-700/80 opacity-55 cursor-not-allowed"
                                        }`}
                                    >
                                        Reroll (15g)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onShopLeave}
                                        className="border border-cyan-300/70 px-4 py-2 hover:bg-cyan-900/25"
                                    >
                                        Leave Shop
                                    </button>
                                </div>
                            </div>

                            <pre className="font-mono text-[10px] md:text-xs text-cyan-200/85 leading-tight text-center whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------+
|  "Coin opens doors, but only judgment keeps them from closing behind you."      |
+----------------------------------------------------------------------------------+`}
                            </pre>
                        </div>
                    </div>
                )}

                {pendingOverlay?.kind === "event" && (
                    <div className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-4">
                        <div className="w-full max-w-6xl min-h-[74vh] border-2 border-fuchsia-300/70 bg-[radial-gradient(ellipse_at_top,#2d1135,#1a0b21_58%,#0f0713)] text-fuchsia-100 p-4 md:p-8 grid grid-rows-[auto_1fr_auto] gap-6 shadow-[0_0_40px_rgba(232,121,249,0.2)]">
                            <pre className="font-mono text-[10px] md:text-xs text-fuchsia-200/90 leading-tight text-center whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------+
|  ________ __     __ _______  _   _  _______    _______   _   _  _______          |
| |  ____/|  \\   / /|  ____|| \\ | ||__   __|  |  ____| | \\ | ||__   __|         |
| | |__   | \\ \\_/ / | |__   |  \\| |   | |     | |__    |  \\| |   | |            |
| |  __|  | |\\   /  |  __|  | . \` |   | |     |  __|   | . \` |   | |            |
| | |____ | | | |   | |____ | |\\  |   | |     | |____  | |\\  |   | |            |
| |______||_| |_|   |______||_| \\_|   |_|     |______| |_| \\_|   |_|            |
|                                                                                  |
|                           R U N E - M A R K E D   E V E N T                      |
+----------------------------------------------------------------------------------+`}
                            </pre>

                            <div className="flex flex-col items-center justify-center gap-5">
                                <div className="text-center text-2xl md:text-4xl tracking-[0.12em] text-fuchsia-200">
                                    {pendingOverlay.event.title.toUpperCase()}
                                </div>
                                <div className="text-center text-sm md:text-base text-fuchsia-100/90 max-w-3xl">
                                    {pendingOverlay.event.description}
                                </div>

                                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
                                    {pendingOverlay.event.options.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => onEventOption(option.id)}
                                            className="min-h-[150px] border border-fuchsia-300/70 bg-black/20 hover:bg-fuchsia-900/25 px-5 py-5 text-left transition-colors"
                                        >
                                            <div className="font-bold text-fuchsia-200 text-xl tracking-wide">{option.label}</div>
                                            <div className="text-sm md:text-base text-fuchsia-100/90 mt-2">{option.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <pre className="font-mono text-[10px] md:text-xs text-fuchsia-200/85 leading-tight text-center whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------+
|     "Every choice writes on steel. Pick wisely and endure the consequence."     |
+----------------------------------------------------------------------------------+`}
                            </pre>
                        </div>
                    </div>
                )}

                <div
                    ref={graphRef}
                    className="relative w-full max-w-6xl h-[clamp(460px,76vh,760px)] bg-neutral-950/30 overflow-hidden"
                >
                    <svg ref={linesSvgRef} className="absolute inset-0 w-full h-full pointer-events-none">
                        {edges.map((edge) => {
                            const from = nodePositions[edge.from];
                            const to = nodePositions[edge.to];
                            if (!from || !to) return null;

                            const isPathFromCurrent = edge.from === currentNodeId;
                            const isCompletedPath = completedNodeIds.has(edge.from) && completedNodeIds.has(edge.to);
                            const isReachableFuture = reachableNodeIds.has(edge.from) && reachableNodeIds.has(edge.to);
                            const isDiscardedPath =
                                edge.from !== currentNodeId &&
                                completedNodeIds.has(edge.from) &&
                                !completedNodeIds.has(edge.to) &&
                                !isReachableFuture;
                            const isUnavailablePath = !isCompletedPath && !isReachableFuture;

                            const stroke = isCompletedPath
                                ? "#34d399"
                                : isPathFromCurrent
                                    ? "#facc15"
                                    : isDiscardedPath
                                        ? "#64748b"
                                        : isUnavailablePath
                                            ? "#64748b"
                                            : "#cbd5e1";
                            const strokeWidth = isCompletedPath
                                ? 1.1
                                : isPathFromCurrent
                                    ? 1.35
                                    : isDiscardedPath
                                        ? 0.62
                                        : isUnavailablePath
                                            ? 0.90
                                            : 0.75;
                            const strokeOpacity = isCompletedPath
                                ? 0.98
                                : isPathFromCurrent
                                    ? 1
                                    : isDiscardedPath
                                        ? 0.80
                                        : isUnavailablePath
                                            ? 0.80
                                            : 0.80;
                            const strokeDasharray = isCompletedPath || isPathFromCurrent
                                ? undefined
                                : isDiscardedPath
                                    ? "1.2 2.5"
                                    : isUnavailablePath
                                        ? "0.9 3.6"
                                        : "1.1 2.1";

                            return (
                                <line
                                    key={`${edge.from}-${edge.to}`}
                                    x1={from.x}
                                    y1={from.y}
                                    x2={to.x}
                                    y2={to.y}
                                    stroke={stroke}
                                    strokeWidth={strokeWidth}
                                    strokeOpacity={strokeOpacity}
                                    strokeDasharray={strokeDasharray}
                                    strokeLinecap="round"
                                />
                            );
                        })}
                    </svg>

                    <div className="relative z-10 h-full flex flex-col justify-between py-2 sm:py-4">
                        {rows.map((rowNodes, index) => (
                            <MapRow
                                key={index}
                                nodes={rowNodes}
                                currentNodeId={currentNodeId}
                                activeNodeId={activeNodeId}
                                completedNodeIds={completedNodeIds}
                                reachableNodeIds={reachableNodeIds}
                                isLocked={runWon}
                                canSelectNode={canSelectNode}
                                onSelectNode={onSelectNode}
                            />
                        ))}
                        <div className="place-self-center">
                            <div
                                data-map-node-id="start"
                                className={`rounded px-2 py-1 font-bold ${currentNodeId === "start" ? "bg-emerald-900/70" : ""}`}
                            >
                                START
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
}
