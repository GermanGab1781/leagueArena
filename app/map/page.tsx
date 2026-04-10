import MapView from "@/components/Map/map";

export default async function MapPage({ searchParams }: { searchParams: Promise<{ champion?: string; load?: string }> }) {
    const params = await searchParams;
    const champion = (params.champion ?? "garen") as ChampionId;
    const loadSaved = params.load === "1";

    return (
        <div className="h-screen w-screen overflow-hidden">
            <MapView initialChampion={champion} loadSaved={loadSaved} />
        </div>
    );
}
