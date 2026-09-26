'use client'
import Link from "next/link";
import { useEffect, useState } from "react";
import MenuScene from "./menuScene";
import IconSlot from "../UI/iconSlot";
import { hasSave, loadRun } from "@/lib/utils/saveLoad";

const SOCIALS = [
    { code: "GH", label: "github",    src: "/icons/menu/menu_github.png",    name: "Github" },
    { code: "LI", label: "linkedin",  src: "/icons/menu/menu_linkedin.png",  name: "LinkedIn" },
    { code: "PF", label: "portfolio", src: "/icons/menu/menu_portfolio.png", name: "Portfolio" },
    { code: "ML", label: "mail",      src: "/icons/menu/menu_mail.png",      name: "Mail" },
];

export default function Menu() {
    const [saveExists, setSaveExists] = useState(false);
    const [loadHref, setLoadHref] = useState("/map?load=1");

    useEffect(() => {
        setSaveExists(hasSave());
        const saved = loadRun();
        if (saved) {
            setLoadHref(`/map?champion=${saved.initialChampion}&load=1`);
        }
    }, []);

    return (
        <div className="relative overflow-hidden h-screen text-white select-none">
            {/* 3D scene fills background */}
            <MenuScene />

            {/* Left-to-right gradient: dark on left (content), transparent on right (model) */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent pointer-events-none" />
            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />

            {/* Main content — left column */}
            <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-14 lg:px-20">

                {/* Title block */}
                <div>
                    <div className="text-[10px] sm:text-xs text-amber-400/70 tracking-[0.55em] uppercase mb-3">
                        Champion Roguelike
                    </div>
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-[0.1em] uppercase leading-[0.9] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.9)]">
                        LEAGUE<br />
                        <span className="text-amber-300">ARENA</span>
                    </h1>
                    <div className="mt-4 text-[11px] sm:text-sm text-neutral-500 tracking-[0.3em] uppercase">
                        Fight · Grow · Conquer
                    </div>
                </div>

                {/* Divider */}
                <div className="w-40 h-px bg-amber-400/35 my-7 sm:my-9" />

                {/* Nav buttons */}
                <div className="flex flex-col gap-y-2.5 w-full max-w-[280px] sm:max-w-xs">
                    <Link href="/select">
                        <div className="border border-amber-400/65 bg-black/50 hover:bg-amber-950/60 px-5 py-3.5 sm:py-4 flex items-center gap-4 transition-colors shadow-[0_0_18px_rgba(251,191,36,0.08)] hover:shadow-[0_0_28px_rgba(251,191,36,0.18)]">
                            <IconSlot
                                code="NG"
                                label="new game"
                                src="/icons/menu/menu_new_game.png"
                                className="h-7 w-7 shrink-0 border-amber-400/65 text-amber-200"
                            />
                            <div>
                                <div className="text-xs sm:text-sm font-bold tracking-[0.22em] uppercase text-amber-100">New Game</div>
                                <div className="text-[10px] text-neutral-500 tracking-[0.18em] mt-0.5 uppercase">Begin a new run</div>
                            </div>
                        </div>
                    </Link>
                    {saveExists ? (
                        <Link href={loadHref}>
                            <div className="border border-neutral-600/50 bg-black/40 hover:bg-neutral-800/50 px-5 py-3.5 sm:py-4 flex items-center gap-4 transition-colors">
                                <IconSlot
                                    code="LD"
                                    label="load game"
                                    src="/icons/menu/menu_load_game.png"
                                    className="h-7 w-7 shrink-0 border-neutral-500/60 text-neutral-400"
                                />
                                <div>
                                    <div className="text-xs sm:text-sm font-bold tracking-[0.22em] uppercase text-neutral-300">Load Game</div>
                                    <div className="text-[10px] text-neutral-600 tracking-[0.18em] mt-0.5 uppercase">Continue last run</div>
                                </div>
                            </div>
                        </Link>
                    ) : (
                        <div className="border border-neutral-800/40 bg-black/20 px-5 py-3.5 sm:py-4 flex items-center gap-4 opacity-40 cursor-not-allowed">
                            <IconSlot
                                code="LD"
                                label="load game"
                                src="/icons/menu/menu_load_game.png"
                                className="h-7 w-7 shrink-0 border-neutral-700/50 text-neutral-600"
                            />
                            <div>
                                <div className="text-xs sm:text-sm font-bold tracking-[0.22em] uppercase text-neutral-600">Load Game</div>
                                <div className="text-[10px] text-neutral-700 tracking-[0.18em] mt-0.5 uppercase">No save found</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Social links */}
                <div className="flex gap-2 mt-8 sm:mt-10">
                    {SOCIALS.map((s) => (
                        <button
                            key={s.code}
                            type="button"
                            className="border border-neutral-700/55 bg-black/35 hover:bg-neutral-800/50 p-2.5 flex flex-col items-center gap-1.5 transition-colors"
                        >
                            <IconSlot
                                code={s.code}
                                label={s.label}
                                src={s.src}
                                className="h-6 w-6 border-neutral-600/55 text-neutral-400"
                            />
                            <span className="text-[9px] text-neutral-600 tracking-[0.15em] uppercase">{s.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Version badge */}
            <div className="absolute bottom-3 right-4 text-[10px] text-neutral-700 tracking-[0.3em] uppercase">
                v0.1 · Alpha
            </div>
        </div>
    );
}
