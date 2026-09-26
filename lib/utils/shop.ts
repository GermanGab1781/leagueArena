import { applyDirectSkillUpgrade } from "@/lib/utils/upgrades";
import { applyRelicOnAcquire, RELIC_DEFS } from "@/lib/utils/relics";

export type ShopOffer =
    | { id: string; kind: "heal"; cost: number; heal: number; label: string; description: string }
    | { id: string; kind: "stat"; cost: number; stat: "armor" | "tenacity"; value: number; label: string; description: string }
    | { id: string; kind: "skill"; cost: number; skill: SkillUpgradeKey; value: number; label: string; description: string }
    | { id: string; kind: "relic"; cost: number; relicId: RelicId; label: string; description: string };

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

export function generateShopOffers(seed: number, player: champion, ownedRelics: RelicId[]): ShopOffer[] {
    const rng = createRng(seed);

    const baseOffers: ShopOffer[] = [
        {
            id: "shop-heal-30",
            kind: "heal",
            cost: 25,
            heal: 30,
            label: "Field Rations",
            description: "Recover 30 HP",
        },
        {
            id: "shop-stat-armor",
            kind: "stat",
            cost: 35,
            stat: "armor",
            value: 3,
            label: "Reinforced Plating",
            description: "+3 Armor",
        },
        {
            id: "shop-stat-tenacity",
            kind: "stat",
            cost: 35,
            stat: "tenacity",
            value: 3,
            label: "Mental Drills",
            description: "+3 Tenacity",
        },
        ...SKILL_UPGRADE_KEYS.map((skill) => ({
            id: `shop-skill-${skill}`,
            kind: "skill" as const,
            cost: 45,
            skill,
            value: 1,
            label: `${skill} Refinement`,
            description: `Apply +1 ${skill} upgrade package`,
        })),
    ];

    const relicOffers: ShopOffer[] = Object.values(RELIC_DEFS)
        .filter((relic) => !ownedRelics.includes(relic.id))
        .map((relic) => ({
            id: `shop-relic-${relic.id}`,
            kind: "relic" as const,
            cost: 70,
            relicId: relic.id,
            label: relic.label,
            description: relic.description,
        }));

    const candidates = [...baseOffers, ...relicOffers].filter((offer) => {
        if (offer.kind === "heal") return player.currentHealth < player.maxHealth;
        return true;
    });

    if (candidates.length <= 3) return candidates;

    const pool = [...candidates];
    const picked: ShopOffer[] = [];
    while (picked.length < 3 && pool.length > 0) {
        const index = Math.floor(rng() * pool.length);
        const [offer] = pool.splice(index, 1);
        if (offer) picked.push(offer);
    }

    return picked;
}

export function applyShopOffer(player: champion, relics: RelicId[], offer: ShopOffer): { player: champion; relics: RelicId[] } {
    if (offer.kind === "heal") {
        return {
            player: {
                ...player,
                currentHealth: Math.min(player.maxHealth, player.currentHealth + offer.heal),
            },
            relics,
        };
    }

    if (offer.kind === "stat") {
        if (offer.stat === "armor") {
            return {
                player: {
                    ...player,
                    baseArmor: player.baseArmor + offer.value,
                    armor: player.armor + offer.value,
                },
                relics,
            };
        }

        return {
            player: {
                ...player,
                baseTenacity: player.baseTenacity + offer.value,
                tenacity: player.tenacity + offer.value,
            },
            relics,
        };
    }

    if (offer.kind === "skill") {
        return {
            player: applyDirectSkillUpgrade(player, offer.skill, offer.value),
            relics,
        };
    }

    if (relics.includes(offer.relicId)) {
        return { player, relics };
    }

    return {
        player: applyRelicOnAcquire(player, offer.relicId),
        relics: [...relics, offer.relicId],
    };
}
