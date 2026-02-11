import { generateRelicOptions } from "@/lib/utils/relics";
import { applyDirectSkillUpgrade } from "@/lib/utils/upgrades";

export type RunEventOption = {
    id: string;
    label: string;
    description: string;
};

export type RunEvent = {
    id: string;
    title: string;
    description: string;
    options: RunEventOption[];
};

const SKILL_UPGRADE_KEYS: SkillUpgradeKey[] = ["Q", "W", "E", "R"];

const RUN_EVENTS: RunEvent[] = [
    {
        id: "forgotten-shrine",
        title: "Forgotten Shrine",
        description: "A crumbling shrine hums with fading magic.",
        options: [
            {
                id: "event-shrine-gold",
                label: "Take the offerings",
                description: "Gain 30 gold",
            },
            {
                id: "event-shrine-heal",
                label: "Pray for strength",
                description: "Recover 20 HP",
            },
            {
                id: "event-shrine-relic",
                label: "Blood ritual",
                description: "Lose 18 HP and discover 3 relics",
            },
        ],
    },
    {
        id: "veteran-drill",
        title: "Veteran Drill",
        description: "A retired captain offers hard lessons for quick growth.",
        options: [
            {
                id: "event-drill-skill",
                label: "Spar for technique",
                description: "Upgrade a random skill (Q/W/E/R)",
            },
            {
                id: "event-drill-defense",
                label: "Defensive regimen",
                description: "Gain +2 armor and +2 tenacity",
            },
            {
                id: "event-drill-gold-hp",
                label: "Paid contract",
                description: "Gain 20 gold, lose 10 HP",
            },
        ],
    },
    {
        id: "risky-cache",
        title: "Risky Cache",
        description: "A sealed cache tempts you with power at a cost.",
        options: [
            {
                id: "event-cache-gold-hp",
                label: "Break it open",
                description: "Gain 45 gold, lose 15 HP",
            },
            {
                id: "event-cache-relic",
                label: "Claim the artifact",
                description: "Discover 3 relics",
            },
            {
                id: "event-cache-heal",
                label: "Take the supplies",
                description: "Recover 25 HP",
            },
        ],
    },
];

const createRng = (seed: number) => {
    let t = seed >>> 0;
    return () => {
        t += 0x6D2B79F5;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
};

function loseHealthSafe(unit: champion, value: number): champion {
    return {
        ...unit,
        currentHealth: Math.max(1, unit.currentHealth - value),
    };
}

export function generateEvent(seed: number): RunEvent {
    const rng = createRng(seed);
    const index = Math.floor(rng() * RUN_EVENTS.length);
    return RUN_EVENTS[index] ?? RUN_EVENTS[0];
}

export function applyEventOption(args: {
    optionId: string;
    player: champion;
    gold: number;
    relics: RelicId[];
    seed: number;
}): { player: champion; gold: number; relics: RelicId[]; relicOptions?: RelicId[] } {
    const { optionId, player, gold, relics, seed } = args;

    if (optionId === "event-shrine-gold") {
        return { player, gold: gold + 30, relics };
    }

    if (optionId === "event-shrine-heal") {
        return {
            player: {
                ...player,
                currentHealth: Math.min(player.maxHealth, player.currentHealth + 20),
            },
            gold,
            relics,
        };
    }

    if (optionId === "event-shrine-relic") {
        return {
            player: loseHealthSafe(player, 18),
            gold,
            relics,
            relicOptions: generateRelicOptions(seed + 17, relics),
        };
    }

    if (optionId === "event-drill-skill") {
        const rng = createRng(seed);
        const key = SKILL_UPGRADE_KEYS[Math.floor(rng() * SKILL_UPGRADE_KEYS.length)];
        return {
            player: applyDirectSkillUpgrade(player, key),
            gold,
            relics,
        };
    }

    if (optionId === "event-drill-defense") {
        return {
            player: {
                ...player,
                baseArmor: player.baseArmor + 2,
                armor: player.armor + 2,
                baseTenacity: player.baseTenacity + 2,
                tenacity: player.tenacity + 2,
            },
            gold,
            relics,
        };
    }

    if (optionId === "event-drill-gold-hp") {
        return {
            player: loseHealthSafe(player, 10),
            gold: gold + 20,
            relics,
        };
    }

    if (optionId === "event-cache-gold-hp") {
        return {
            player: loseHealthSafe(player, 15),
            gold: gold + 45,
            relics,
        };
    }

    if (optionId === "event-cache-relic") {
        return {
            player,
            gold,
            relics,
            relicOptions: generateRelicOptions(seed + 43, relics),
        };
    }

    if (optionId === "event-cache-heal") {
        return {
            player: {
                ...player,
                currentHealth: Math.min(player.maxHealth, player.currentHealth + 25),
            },
            gold,
            relics,
        };
    }

    return { player, gold, relics };
}
