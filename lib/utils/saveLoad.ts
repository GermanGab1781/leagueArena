const SAVE_KEY = "league_arena_save";

export type RunSave = {
    version: number;
    initialChampion: ChampionId;
    player: champion;
    relics: RelicId[];
    gold: number;
    mapSeed: number;
    currentNodeId: string;
    completedNodeIds: string[];
};

const CURRENT_VERSION = 1;

export function saveRun(data: Omit<RunSave, "version">): void {
    try {
        const save: RunSave = { version: CURRENT_VERSION, ...data };
        localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
        // localStorage unavailable (SSR or private mode)
    }
}

export function loadRun(): RunSave | null {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as RunSave;
        if (parsed.version !== CURRENT_VERSION) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function clearSave(): void {
    try {
        localStorage.removeItem(SAVE_KEY);
    } catch {
        // ignore
    }
}

export function hasSave(): boolean {
    try {
        return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
        return false;
    }
}
