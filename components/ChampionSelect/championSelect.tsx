'use client'
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createChampion } from "@/lib/champions";

type ChampionCard = {
    id: ChampionId;
    title: string;
    role: string;
    style: string;
    iconPath: string;
    kitSummary: string[];
    comboBrief: string;
};

const CHAMPION_CARDS: ChampionCard[] = [
    {
        id: "garen",
        title: "GAREN",
        role: "Vanguard",
        style: "Tank / Execute",
        iconPath: "/models/Garen/icon.png",
        kitSummary: [
            "Q — Decisive Strike: charge in and deal heavy physical damage",
            "W — Courage: gain armor and tenacity boost + heal 8% max HP",
            "E — Judgment: spin through the enemy, cracking their armor",
            "R — Demacian Justice: execute enemies below 30% HP instantly",
        ],
        comboBrief: "E → Q → R when enemy is low",
    },
    {
        id: "xinzhao",
        title: "XIN ZHAO",
        role: "Skirmisher",
        style: "Aggressive / Stun",
        iconPath: "/models/xin zhao/icon.webp",
        kitSummary: [
            "Q — Three Talon Strike: rapid strike that stuns the enemy",
            "W — Wind Becomes Lightning: lunging slash for high burst",
            "E — Audacious Charge: dash in, cracking enemy tenacity",
            "R — Crescent Guard: true damage that scales with tenacity cracks",
        ],
        comboBrief: "E → W → Q stun → R finish",
    },
    {
        id: "darius",
        title: "DARIUS",
        role: "Juggernaut",
        style: "Bleed / Burst",
        iconPath: "/models/Darius/icon.png",
        kitSummary: [
            "Q — Decimate: broad swing that also heals based on missing HP",
            "W — Crippling Strike: heavy strike, slows enemy actions",
            "E — Apprehend: crack enemy armor in multiple stacks",
            "R — Noxian Guillotine: bonus true damage per armor crack stack",
        ],
        comboBrief: "E → E → R for max damage",
    },
];

const ROLE_COLOR: Record<string, string> = {
    "Vanguard": "text-blue-300",
    "Skirmisher": "text-amber-300",
    "Juggernaut": "text-red-300",
};

const ROLE_BORDER_SELECTED: Record<string, string> = {
    "Vanguard": "border-blue-400/80 shadow-[0_0_32px_rgba(96,165,250,0.2)]",
    "Skirmisher": "border-amber-400/80 shadow-[0_0_32px_rgba(251,191,36,0.2)]",
    "Juggernaut": "border-red-500/80 shadow-[0_0_32px_rgba(239,68,68,0.2)]",
};

export default function ChampionSelect() {
    const router = useRouter();
    const [selected, setSelected] = useState<ChampionId | null>(null);
    const [imgErrors, setImgErrors] = useState<Partial<Record<ChampionId, boolean>>>({});

    const handleBeginRun = () => {
        if (!selected) return;
        router.push(`/map?champion=${selected}`);
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white select-none flex flex-col">
            {/* Header */}
            <div className="flex flex-col items-center pt-8 pb-4 px-4">
                <div className="text-[10px] text-amber-400/70 tracking-[0.55em] uppercase mb-2">Choose Your Path</div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-[0.15em] uppercase text-white">
                    SELECT <span className="text-amber-300">CHAMPION</span>
                </h1>
                <div className="w-40 h-px bg-amber-400/30 mt-4" />
            </div>

            {/* Champion cards */}
            <div className="flex-1 flex items-center justify-center px-4 py-4">
                <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4">
                    {CHAMPION_CARDS.map((card) => {
                        const champ = createChampion(card.id);
                        const isSelected = selected === card.id;
                        const hasImgError = imgErrors[card.id];
                        const roleColor = ROLE_COLOR[card.role] ?? "text-neutral-400";
                        const selectedBorder = ROLE_BORDER_SELECTED[card.role] ?? "border-amber-400/80";

                        return (
                            <button
                                key={card.id}
                                type="button"
                                onClick={() => setSelected(card.id)}
                                className={`text-left flex flex-col transition-all duration-200 border-2 overflow-hidden ${
                                    isSelected
                                        ? `${selectedBorder} bg-neutral-900/60`
                                        : "border-neutral-700/60 bg-neutral-900/40 hover:border-neutral-500/80 hover:bg-neutral-800/40"
                                }`}
                            >
                                {/* Champion portrait */}
                                <div className="relative w-full aspect-square bg-neutral-800/60 overflow-hidden">
                                    {!hasImgError ? (
                                        <Image
                                            src={card.iconPath}
                                            alt={card.title}
                                            fill
                                            className="object-cover object-top"
                                            onError={() => setImgErrors(prev => ({ ...prev, [card.id]: true }))}
                                            unoptimized
                                        />
                                    ) : (
                                        /* Fallback placeholder when image is missing */
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                            <div className={`text-5xl font-black tracking-wider ${roleColor}`}>
                                                {card.title.charAt(0)}
                                            </div>
                                            <div className="text-[10px] text-neutral-600 tracking-[0.3em] uppercase">No image</div>
                                        </div>
                                    )}
                                    {/* Role badge overlay */}
                                    <div className={`absolute top-2 left-2 text-[10px] tracking-[0.25em] uppercase px-2 py-0.5 bg-black/70 ${roleColor}`}>
                                        {card.role}
                                    </div>
                                    {/* Selected glow overlay */}
                                    {isSelected && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-transparent to-transparent pointer-events-none" />
                                    )}
                                </div>

                                {/* Card body */}
                                <div className="p-4 flex flex-col gap-3">
                                    {/* Champion name + style */}
                                    <div>
                                        <div className={`text-2xl sm:text-3xl font-black tracking-[0.12em] ${isSelected ? roleColor : "text-white"}`}>
                                            {card.title}
                                        </div>
                                        <div className="text-[10px] text-neutral-500 tracking-[0.2em] uppercase mt-0.5">
                                            {card.style}
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        {[
                                            { label: "HP", value: champ.maxHealth },
                                            { label: "Armor", value: champ.baseArmor },
                                            { label: "Tenacity", value: champ.baseTenacity },
                                        ].map((stat) => (
                                            <div key={stat.label} className="bg-black/30 py-2 px-1">
                                                <div className={`text-base font-bold ${isSelected ? roleColor : "text-neutral-200"}`}>
                                                    {stat.value}
                                                </div>
                                                <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                                                    {stat.label}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Kit summary */}
                                    <div className="flex flex-col gap-1.5">
                                        {card.kitSummary.map((line) => (
                                            <div key={line} className="text-xs text-neutral-400 leading-snug">
                                                <span className={`font-bold ${isSelected ? roleColor : "text-neutral-300"}`}>
                                                    {line.split(":")[0]}:
                                                </span>
                                                {line.split(":").slice(1).join(":")}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Combo brief */}
                                    <div className={`text-[11px] tracking-[0.15em] uppercase border-t pt-3 ${
                                        isSelected ? `border-current/30 ${roleColor} opacity-80` : "border-neutral-700/50 text-neutral-500"
                                    }`}>
                                        Combo: {card.comboBrief}
                                    </div>

                                    {/* Selected indicator */}
                                    {isSelected && (
                                        <div className={`text-[10px] tracking-[0.35em] uppercase text-center font-bold ${roleColor}`}>
                                            ✦ Selected ✦
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom action bar */}
            <div className="flex flex-col items-center gap-3 pb-8 px-4">
                <button
                    type="button"
                    onClick={handleBeginRun}
                    disabled={!selected}
                    className={`px-12 py-4 text-sm font-bold tracking-[0.25em] uppercase transition-all border-2 ${
                        selected
                            ? "border-amber-400/80 bg-amber-950/40 text-amber-100 hover:bg-amber-900/50 shadow-[0_0_24px_rgba(251,191,36,0.2)]"
                            : "border-neutral-700/50 bg-neutral-900/30 text-neutral-600 cursor-not-allowed"
                    }`}
                >
                    {selected ? "Begin Run" : "Select a Champion"}
                </button>
                <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="text-xs text-neutral-600 hover:text-neutral-400 tracking-[0.2em] uppercase transition-colors"
                >
                    ← Back to Menu
                </button>
            </div>
        </div>
    );
}
