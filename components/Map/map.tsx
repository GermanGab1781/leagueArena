'use client'

import { useMemo, useState } from "react";
import Combat from "../Combat/combat";
import { createChampion, scaleChampion } from "@/lib/champions";
import MapRow from "./row";
import { prepareChampionForNextEncounter } from "@/lib/utils/combat";
import { applyUpgradeOption, generateUpgradeOptions, type UpgradeOption } from "@/lib/utils/upgrades";

type MapNodeData = {
    id: string;
    row: number;
    order: number;
    kind?: "boss";
};

type MapEdge = {
    from: string;
    to: string;
};

type MapGraph = {
    nodes: MapNodeData[];
    edges: MapEdge[];
};

const PLAYER_CHAMPION: ChampionId = "garen";
const ENEMY_POOL: ChampionId[] = ["darius", "garen"];

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

const generateEnemyForNode = (node: MapNodeData, seed: number, playerChampionName: string): champion => {
    const pool = ENEMY_POOL.filter((id) => id !== playerChampionName.toLowerCase());
    const enemyPool = pool.length > 0 ? pool : ENEMY_POOL;
    const pick = hashText(`${seed}-${node.id}`) % enemyPool.length;
    const baseEnemy = createChampion(enemyPool[pick]);

    const rowScale = 1 + node.row * 0.08;
    const bossBonus = node.kind === "boss" ? 0.2 : 0;

    return scaleChampion(baseEnemy, rowScale + bossBonus);
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
            nodes.push({ id, row, order, kind: isBoss ? "boss" : undefined });
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
                targets.add(nextRow[Math.floor(rng() * nextRow.length)].id);
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
    const [mapSeed, setMapSeed] = useState(() => Date.now());
    const [player, setPlayer] = useState<champion>(() => createChampion(PLAYER_CHAMPION));
    const [enemy, setEnemy] = useState<champion>(() => createChampion("darius"));
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [completedNodeIds, setCompletedNodeIds] = useState<Set<string>>(() => new Set());
    const [pendingUpgradeOptions, setPendingUpgradeOptions] = useState<UpgradeOption[] | null>(null);
    const [runWon, setRunWon] = useState(false);

    const { rows, nodeById, edgesByFrom } = useMemo(() => {
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

        nodeMap.set("start", { id: "start", row: 0, order: 0 });

        return { rows: orderedRows, nodeById: nodeMap, edgesByFrom: nextByFrom };
    }, [mapSeed]);

    const canSelectNode = (nodeId: string) => {
        if (activeNodeId || pendingUpgradeOptions || runWon) return false;

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
        setPendingUpgradeOptions(null);
        setRunWon(false);
    };

    const onSelectNode = (nodeId: string) => {
        if (!canSelectNode(nodeId)) return;

        const selectedNode = nodeById.get(nodeId);
        if (!selectedNode) return;

        setEnemy(generateEnemyForNode(selectedNode, mapSeed, player.name));
        setActiveNodeId(nodeId);
    };

    const handleCombatWin = (updatedPlayer: champion) => {
        if (!activeNodeId) return;

        const preparedPlayer = prepareChampionForNextEncounter(updatedPlayer);
        const healedPlayer = {
            ...preparedPlayer,
            currentHealth: Math.min(preparedPlayer.maxHealth, preparedPlayer.currentHealth + 50),
        };
        setPlayer(healedPlayer);
        setCurrentNodeId(activeNodeId);
        setCompletedNodeIds((prev) => {
            const next = new Set(prev);
            next.add(activeNodeId);
            return next;
        });

        const wonNode = nodeById.get(activeNodeId);
        if (wonNode?.kind === "boss") {
            setRunWon(true);
            setPendingUpgradeOptions(null);
        } else {
            const upgradeSeed = hashText(`${mapSeed}-${activeNodeId}-${completedNodeIds.size + 1}`);
            setPendingUpgradeOptions(generateUpgradeOptions(upgradeSeed));
        }

        setActiveNodeId(null);
    };

    const onSelectUpgrade = (option: UpgradeOption) => {
        setPlayer((prev) => applyUpgradeOption(prev, option));
        setPendingUpgradeOptions(null);
    };

    const handleCombatLose = () => {
        restartMap();
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
                {runWon && <div className="border px-3 py-1 bg-green-900/60">Boss defeated</div>}
            </div>

            <div className="flex flex-col gap-y-20">
                {pendingUpgradeOptions && (
                    <div className="border-2 border-yellow-500 bg-neutral-900/90 p-4 flex flex-col gap-3">
                        <div className="text-center text-lg text-yellow-300">Victory Reward: choose one upgrade</div>
                        <div className="text-center text-sm text-green-300">You healed +50 HP from this win.</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {pendingUpgradeOptions.map((option) => (
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
                <div className={`border place-self-center px-2 ${currentNodeId === "start" ? "bg-emerald-900/70" : ""}`}>
                    START
                </div>
            </div>
        </div>
    );
}
