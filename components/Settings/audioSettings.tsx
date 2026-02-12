'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type AudioSettingsContextValue = {
    musicVolume: number;
    setMusicVolume: React.Dispatch<React.SetStateAction<number>>;
    sfxVolume: number;
    setSfxVolume: React.Dispatch<React.SetStateAction<number>>;
};

const DEFAULT_MUSIC_VOLUME = 0.35;
const DEFAULT_SFX_VOLUME = 0.09;
const STORAGE_KEY_MUSIC = "leagueArena_musicVolume";
const STORAGE_KEY_SFX = "leagueArena_sfxVolume";

const AudioSettingsContext = createContext<AudioSettingsContextValue | null>(null);

export function AudioSettingsProvider({ children }: { children: React.ReactNode }) {
    const [musicVolume, setMusicVolume] = useState(DEFAULT_MUSIC_VOLUME);
    const [sfxVolume, setSfxVolume] = useState(DEFAULT_SFX_VOLUME);
    const [isOpen, setIsOpen] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const savedMusic = window.localStorage.getItem(STORAGE_KEY_MUSIC);
        const savedSfx = window.localStorage.getItem(STORAGE_KEY_SFX);

        if (savedMusic !== null) {
            const parsed = Number(savedMusic);
            if (!Number.isNaN(parsed)) setMusicVolume(Math.max(0, Math.min(1, parsed)));
        }

        if (savedSfx !== null) {
            const parsed = Number(savedSfx);
            if (!Number.isNaN(parsed)) setSfxVolume(Math.max(0, Math.min(1, parsed)));
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY_MUSIC, String(musicVolume));
    }, [musicVolume]);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY_SFX, String(sfxVolume));
    }, [sfxVolume]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = musicVolume;
    }, [musicVolume]);

    useEffect(() => {
        const tryPlayMusic = () => {
            const audio = audioRef.current;
            if (!audio) return;
            audio.play().catch(() => {
                /* ignored: browser may block autoplay before interaction */
            });
        };

        tryPlayMusic();
        window.addEventListener("pointerdown", tryPlayMusic, { once: true });
        return () => {
            window.removeEventListener("pointerdown", tryPlayMusic);
        };
    }, []);

    const value = useMemo(() => ({
        musicVolume,
        setMusicVolume,
        sfxVolume,
        setSfxVolume,
    }), [musicVolume, sfxVolume]);

    return (
        <AudioSettingsContext.Provider value={value}>
            {children}
            <audio ref={audioRef} src="/music/Main.mp3" loop preload="auto" />

            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="fixed top-3 right-3 z-[100] border px-3 py-1 bg-neutral-900/90 hover:bg-neutral-800"
            >
                Settings
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4">
                    <div className="w-full max-w-md border bg-neutral-900 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">Audio Settings</h2>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="border px-2 py-1 hover:bg-neutral-800"
                            >
                                Close
                            </button>
                        </div>

                        <div className="space-y-4">
                            <label className="block">
                                <div className="mb-1">MUSIC: {Math.round(musicVolume * 100)}%</div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={Math.round(musicVolume * 100)}
                                    onChange={(event) => setMusicVolume(Number(event.target.value) / 100)}
                                    className="w-full"
                                />
                            </label>

                            <label className="block">
                                <div className="mb-1">SFX: {Math.round(sfxVolume * 100)}%</div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={Math.round(sfxVolume * 100)}
                                    onChange={(event) => setSfxVolume(Number(event.target.value) / 100)}
                                    className="w-full"
                                />
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </AudioSettingsContext.Provider>
    );
}

export function useAudioSettings() {
    return useContext(AudioSettingsContext);
}
